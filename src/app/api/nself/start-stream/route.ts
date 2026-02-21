import { findNselfPath, getEnhancedPath } from '@/lib/nself-path'
import { getProjectPath } from '@/lib/paths'
import { spawn } from 'child_process'
import fs from 'fs'
import { NextRequest } from 'next/server'
import path from 'path'

export async function POST(_request: NextRequest) {
  const encoder = new TextEncoder()
  const projectPath = getProjectPath()

  console.log('Start-stream API called')
  console.log('Project path:', projectPath)

  // Check if docker-compose.yml exists
  const dockerComposePath = path.join(projectPath, 'docker-compose.yml')

  if (!fs.existsSync(dockerComposePath)) {
    console.error('docker-compose.yml not found!')
    return new Response(
      encoder.encode(
        JSON.stringify({
          type: 'error',
          message: 'No docker-compose.yml found in project directory',
          error: `Project not initialized at ${projectPath}. Run nself init and nself build first.`,
        }) + '\n',
      ),
      { status: 400 },
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Find nself CLI using the centralized utility
        const nselfPath = await findNselfPath()

        // Check if nself was found - findNselfPath now returns the actual path
        // If it returns just 'nself', it couldn't find a specific path but it might still work
        if (nselfPath === 'nself') {
          // Verify it's actually in PATH using enhanced PATH
          const whichProcess = spawn('which', ['nself'], {
            env: { ...process.env, PATH: getEnhancedPath() },
          })
          const inPath = await new Promise<boolean>((resolve) => {
            whichProcess.on('close', (code) => resolve(code === 0))
          })

          if (!inPath) {
            console.error('nself CLI not found in any expected location')
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message:
                    'nself CLI not found. Please install or reinstall nself.',
                  error:
                    'The nself command-line tool is required but was not found on your system.',
                  instructions: [
                    'To install nself:',
                    '1. Visit https://github.com/nself-org/cli',
                    '2. Follow the installation instructions for your operating system',
                    '3. Ensure nself is in your PATH or installed in /usr/local/bin',
                    '4. Try running "nself version" in your terminal to verify installation',
                  ],
                }) + '\n',
              ),
            )
            controller.close()
            return
          }
        }

        console.log('Using nself command:', nselfPath)

        // First, check which images need to be pulled
        const checkProcess = spawn('docker-compose', ['config', '--images'], {
          cwd: projectPath,
          env: {
            ...process.env,
            PATH: getEnhancedPath(),
          },
        })

        let allImages: string[] = []
        let imageData = ''

        checkProcess.stdout.on('data', (data) => {
          imageData += data.toString()
        })

        await new Promise((resolve) => {
          checkProcess.on('close', () => {
            allImages = imageData.split('\n').filter((img) => img.trim())
            resolve(undefined)
          })
        })

        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'status',
              message: `Checking ${allImages.length} Docker images...`,
              totalImages: allImages.length,
            }) + '\n',
          ),
        )

        // Check which images are already downloaded
        const localImages = await checkLocalImages()
        const imagesToPull = allImages.filter(
          (img) => !localImages.includes(img),
        )

        if (imagesToPull.length > 0) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: 'progress',
                message: `Downloading ${imagesToPull.length} of ${allImages.length} images...`,
                imagesToPull: imagesToPull.length,
                totalImages: allImages.length,
                percentage: Math.round(
                  ((allImages.length - imagesToPull.length) /
                    allImages.length) *
                    100,
                ),
              }) + '\n',
            ),
          )
        }

        // Start services using nself start
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'status',
              message: 'Starting services with nself CLI...',
              command: `${nselfPath} start`,
              cwd: projectPath,
            }) + '\n',
          ),
        )

        console.log('Executing nself start:', {
          command: nselfPath,
          args: ['start'],
          cwd: projectPath,
        })

        const composeProcess = spawn(nselfPath, ['start'], {
          cwd: projectPath,
          env: {
            ...process.env,
            PATH: getEnhancedPath(),
            COMPOSE_PARALLEL_LIMIT: '4',
            NSELF_PROJECT_PATH: projectPath,
            HOME: process.env.HOME || '/root',
          },
          shell: false,
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        let pulledImages = 0
        let startedContainers = 0
        let lastProgress = ''

        // Track both stdout and stderr for nself output
        const handleOutput = (data: Buffer) => {
          // Remove ANSI color codes
          const output = data.toString().replace(/\x1b\[[0-9;]*m/g, '')
          const lines = output.split('\n')

          for (const line of lines) {
            // Track image pulling
            if (
              line.includes('Pulling') &&
              !line.includes('Pulling fs layer')
            ) {
              const match = line.match(/(\w+)\s+Pulling/)
              if (match) {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: 'progress',
                      message: `Pulling image for ${match[1]}...`,
                      service: match[1],
                    }) + '\n',
                  ),
                )
              }
            }

            // Track download progress
            if (line.includes('Downloading')) {
              const match = line.match(
                /\[([=>]+)\s*\]\s*([\d.]+)MB\/([\d.]+)MB/,
              )
              if (match) {
                const current = parseFloat(match[2])
                const total = parseFloat(match[3])
                const percentage = Math.round((current / total) * 100)
                const progressMsg = `Downloading: ${percentage}% (${current.toFixed(1)}MB/${total.toFixed(1)}MB)`

                if (progressMsg !== lastProgress) {
                  lastProgress = progressMsg
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: 'download',
                        message: progressMsg,
                        percentage,
                      }) + '\n',
                    ),
                  )
                }
              }
            }

            // Track pull completion
            if (line.includes('Pull complete')) {
              pulledImages++
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'progress',
                    message: `Downloaded ${pulledImages} images...`,
                    pulledImages,
                  }) + '\n',
                ),
              )
            }

            // Track container creation
            if (line.includes('Creating') || line.includes('Starting')) {
              const match = line.match(
                /(Creating|Starting)\s+(.+?)(?:\s+\.\.\.|$)/,
              )
              if (match) {
                startedContainers++
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: 'container',
                      message: `${match[1]} ${match[2]}...`,
                      action: match[1].toLowerCase(),
                      container: match[2],
                      startedContainers,
                    }) + '\n',
                  ),
                )
              }
            }

            // Handle errors
            if (line.toLowerCase().includes('error')) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'error',
                    message: line.trim(),
                  }) + '\n',
                ),
              )
            }

            // Track nself specific output
            if (
              line.includes('✓') ||
              line.includes('Starting') ||
              line.includes('Restarting')
            ) {
              // Parse "Starting Docker containers... (12/20)" format
              const containerMatch = line.match(
                /Starting Docker containers.*\((\d+)\/(\d+)\)/,
              )
              if (containerMatch) {
                const current = parseInt(containerMatch[1])
                const total = parseInt(containerMatch[2])
                const percentage = Math.round((current / total) * 100)
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: 'container',
                      message: `Starting containers: ${current}/${total}`,
                      current,
                      total,
                      percentage,
                    }) + '\n',
                  ),
                )
              } else {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: 'progress',
                      message: line.trim(),
                    }) + '\n',
                  ),
                )
              }
            }
          }
        }

        // Collect all output for debugging while also processing it
        let allOutput = ''
        let errorOutput = ''

        // Single handler for stdout that both processes and collects
        composeProcess.stdout.on('data', (data) => {
          allOutput += data.toString()
          handleOutput(data)
        })

        // Single handler for stderr that both processes and collects
        composeProcess.stderr.on('data', (data) => {
          errorOutput += data.toString()
          handleOutput(data)
        })

        // Wait for process to complete
        await new Promise<void>((resolve) => {
          let hasErrors = false

          composeProcess.on('error', (error: any) => {
            hasErrors = true
            console.error('Process spawn error:', error)

            // More helpful error messages based on error code
            let errorMessage = 'Failed to start services'
            let instructions: string[] = []

            if (error.code === 'ENOENT') {
              errorMessage = 'nself CLI executable not found'
              instructions = [
                'The nself command could not be executed.',
                'Please ensure nself is properly installed:',
                '1. Run "nself version" in your terminal to check if it\'s installed',
                '2. If not installed, visit https://github.com/nself-org/cli',
                '3. Follow the installation instructions for your OS',
                '4. Restart this application after installation',
              ]
            } else if (error.code === 'EACCES') {
              errorMessage = 'Permission denied when executing nself'
              instructions = [
                'The nself command exists but is not executable.',
                'To fix this:',
                `1. Run: chmod +x ${nselfPath}`,
                '2. Try again',
              ]
            } else if (error.code === 127) {
              errorMessage = 'Command not found'
              instructions = [
                'The shell could not find the nself command.',
                'This usually means nself is not in your PATH.',
                'To fix this:',
                '1. Ensure nself is installed',
                '2. Add nself to your PATH or install it in /usr/local/bin',
                '3. Restart your terminal and this application',
              ]
            } else {
              errorMessage = `Process error: ${error.message}`
            }

            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: 'error',
                  message: errorMessage,
                  details: error.toString(),
                  code: error.code,
                  instructions,
                }) + '\n',
              ),
            )
          })

          composeProcess.on('close', (code) => {
            console.log('nself start process closed with code:', code)
            console.log('Output:', allOutput)
            console.log('Error output:', errorOutput)

            // Check if containers were actually started or already running
            const hasStartedContainers =
              allOutput.includes('Container') ||
              allOutput.includes('Started') ||
              errorOutput.includes('Container')

            // Check if services are already running (common case for exit code 1)
            const alreadyRunning =
              allOutput.includes('already running') ||
              allOutput.includes('Already running') ||
              errorOutput.includes('already running') ||
              errorOutput.includes('Already running')

            // nself CLI returns 1 when services are already running or on some non-fatal issues
            // Check if we saw actual errors or if services are running
            if (
              code === 0 ||
              hasStartedContainers ||
              alreadyRunning ||
              (code === 1 && (!hasErrors || startedContainers > 0))
            ) {
              // Check how many containers are actually running
              const checkContainers = spawn(
                'docker',
                ['ps', '--format', '{{.Names}}'],
                {
                  cwd: projectPath,
                },
              )

              let containerList = ''
              checkContainers.stdout.on('data', (data) => {
                containerList += data.toString()
              })

              checkContainers.on('close', () => {
                const runningContainers = containerList
                  .split('\n')
                  .filter((name) => name.includes('nproj')).length

                if (runningContainers > 0) {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: 'complete',
                        message: `Services are running! (${runningContainers} containers active)`,
                        startedContainers: runningContainers,
                        exitCode: code,
                        hasStartedContainers: true,
                      }) + '\n',
                    ),
                  )
                } else if (code === 0) {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: 'complete',
                        message:
                          'Services start process completed successfully!',
                        startedContainers,
                        exitCode: code,
                        hasStartedContainers,
                      }) + '\n',
                    ),
                  )
                } else {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: 'error',
                        message:
                          'Services may not have started properly. Please check Docker Desktop.',
                        exitCode: code,
                        output: allOutput.slice(-500),
                        errorOutput: errorOutput.slice(-500),
                      }) + '\n',
                    ),
                  )
                }
                resolve()
              })
            } else {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: 'error',
                    message: `Process exited with code ${code}`,
                    exitCode: code,
                    output: allOutput.slice(-500), // Last 500 chars
                    errorOutput: errorOutput.slice(-500), // Last 500 chars
                  }) + '\n',
                ),
              )
              // Still resolve to allow partial success
              resolve()
            }
          })
        })

        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: 'error',
              message:
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred',
            }) + '\n',
          ),
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

async function checkLocalImages(): Promise<string[]> {
  return new Promise((resolve) => {
    const checkProcess = spawn('docker', [
      'images',
      '--format',
      '{{.Repository}}:{{.Tag}}',
    ])
    let imageData = ''

    checkProcess.stdout.on('data', (data) => {
      imageData += data.toString()
    })

    checkProcess.on('close', () => {
      const images = imageData
        .split('\n')
        .filter((img) => img.trim() && img !== '<none>:<none>')
      resolve(images)
    })

    checkProcess.on('error', () => {
      resolve([]) // Return empty array if docker command fails
    })
  })
}
