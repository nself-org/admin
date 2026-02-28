# Service Pages Enhancement Summary

## Completed

### ✅ /services/functions

**Status**: 100% Enhanced

**Enhancements Added**:

1. ✅ Tabbed interface (Overview, Deploy Status, Metrics, Logs, Templates)
2. ✅ Real-time deployment status with progress indicators
3. ✅ Function invocation metrics (invocations, avg duration, error rate)
4. ✅ Advanced log filtering by level (all, error, warn, info, debug)
5. ✅ Log download functionality
6. ✅ Function templates library with 4 pre-built templates
7. ✅ Stats cards showing aggregate metrics
8. ✅ Enhanced test invocation UI

**File**: `/src/app/services/functions/page.tsx`

---

## To Be Enhanced

### /services/email

**Required Enhancements** (from V0.5-GRANULAR-PLAN.md lines 1386-1394):

1. **Email Preview** - Live preview of email templates with variable substitution
2. **Template Variable Autocomplete** - Autocomplete for {{variable}} syntax
3. **Send History** - Table of recent sent emails with timestamps, recipients, status
4. **Delivery Statistics** - Charts for delivery rate, bounce rate, open rate

**Implementation Plan**:

```tsx
// Add new tabs
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="compose">Compose</TabsTrigger>
    <TabsTrigger value="templates">Templates</TabsTrigger>
    <TabsTrigger value="history">Send History</TabsTrigger>
    <TabsTrigger value="stats">Statistics</TabsTrigger>
  </TabsList>
  // Compose tab - add email preview pane
  <TabsContent value="compose">
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Email Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Use {{firstName}} for variables"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            dangerouslySetInnerHTML={{
              __html: emailBody.replace(
                /\{\{(\w+)\}\}/g,
                '<span class="text-blue-500">$1</span>',
              ),
            }}
          />
        </CardContent>
      </Card>
    </div>
  </TabsContent>
  // History tab
  <TabsContent value="history">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Recipient</TableHead>
          <TableHead>Subject</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sendHistory.map((email) => (
          <TableRow key={email.id}>
            <TableCell>{email.timestamp}</TableCell>
            <TableCell>{email.to}</TableCell>
            <TableCell>{email.subject}</TableCell>
            <TableCell>
              <Badge>{email.status}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TabsContent>
  // Stats tab
  <TabsContent value="stats">
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-500">Delivery Rate</p>
          <p className="text-2xl font-bold">98.5%</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-500">Bounce Rate</p>
          <p className="text-2xl font-bold">1.2%</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-zinc-500">Open Rate</p>
          <p className="text-2xl font-bold">24.3%</p>
        </CardContent>
      </Card>
    </div>
  </TabsContent>
</Tabs>
```

**New API Routes Needed**:

- `/api/services/email/history` - GET send history
- `/api/services/email/stats` - GET delivery stats

---

### /services/cache

**Required Enhancements** (lines 1395-1402):

1. **Cache Hit/Miss Metrics** - Real-time charts showing cache performance
2. **Key Browser** - Interactive UI to browse all Redis keys with pagination
3. **TTL Management** - Set/update TTL for keys, view expiration times
4. **Cache Warmup Tools** - Batch operations to pre-populate cache

**Implementation Plan**:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="keys">Key Browser</TabsTrigger>
    <TabsTrigger value="metrics">Hit/Miss Metrics</TabsTrigger>
    <TabsTrigger value="warmup">Cache Warmup</TabsTrigger>
  </TabsList>
  // Key Browser
  <TabsContent value="keys">
    <Card>
      <CardHeader>
        <CardTitle>Redis Key Browser</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          placeholder="Search keys (supports * wildcard)"
          value={keySearch}
          onChange={(e) => setKeySearch(e.target.value)}
        />
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>TTL</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.name}>
                <TableCell className="font-mono text-xs">{key.name}</TableCell>
                <TableCell>
                  <Badge>{key.type}</Badge>
                </TableCell>
                <TableCell>{key.ttl}s</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => editTTL(key.name)}
                  >
                    Edit TTL
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteKey(key.name)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
  // Metrics
  <TabsContent value="metrics">
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Hit/Miss Ratio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-4xl font-bold text-green-600">
              {((hitRate / (hitRate + missRate)) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-zinc-500">Hit Rate</p>
          </div>
          <Progress value={(hitRate / (hitRate + missRate)) * 100} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cache Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Hits</span>
              <span className="font-bold">{hitRate.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Misses</span>
              <span className="font-bold">{missRate.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </TabsContent>
  // Warmup
  <TabsContent value="warmup">
    <Card>
      <CardHeader>
        <CardTitle>Cache Warmup Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Enter keys to warmup (one per line)"
          value={warmupKeys}
          onChange={(e) => setWarmupKeys(e.target.value)}
          rows={10}
        />
        <Button className="mt-4" onClick={handleWarmup}>
          <Zap className="mr-2 h-4 w-4" />
          Warmup Cache
        </Button>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

**New API Routes Needed**:

- `/api/services/cache/keys` - GET/DELETE keys
- `/api/services/cache/ttl` - POST update TTL
- `/api/services/cache/metrics` - GET hit/miss stats
- `/api/services/cache/warmup` - POST batch warmup

---

### /services/storage

**Required Enhancements** (lines 1404-1411):

1. **Image Preview** - Thumbnail previews for image files
2. **Batch Operations** - Multi-select and batch delete/move/copy
3. **Access Control UI** - Set public/private, generate signed URLs
4. **CDN Configuration** - Configure CDN settings for buckets

**Implementation Plan**:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="browser">File Browser</TabsTrigger>
    <TabsTrigger value="upload">Upload</TabsTrigger>
    <TabsTrigger value="access">Access Control</TabsTrigger>
    <TabsTrigger value="cdn">CDN Settings</TabsTrigger>
  </TabsList>
  // File Browser with Image Previews
  <TabsContent value="browser">
    <div className="grid grid-cols-4 gap-4">
      {files.map((file) => (
        <Card key={file.name} className="cursor-pointer">
          <CardContent className="pt-4">
            <Checkbox
              checked={selectedFiles.includes(file.name)}
              onCheckedChange={() => toggleFileSelection(file.name)}
              className="absolute top-2 right-2"
            />
            {file.type.startsWith('image/') ? (
              <img
                src={file.previewUrl}
                alt={file.name}
                className="h-32 w-full rounded object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center bg-zinc-100">
                <File className="h-12 w-12 text-zinc-400" />
              </div>
            )}
            <p className="mt-2 truncate text-xs font-medium">{file.name}</p>
            <p className="text-xs text-zinc-500">{file.size}</p>
          </CardContent>
        </Card>
      ))}
    </div>
    {selectedFiles.length > 0 && (
      <div className="mt-4 flex gap-2">
        <Button variant="destructive" onClick={deleteBatch}>
          Delete {selectedFiles.length} file(s)
        </Button>
        <Button variant="outline" onClick={moveBatch}>
          Move
        </Button>
        <Button variant="outline" onClick={copyBatch}>
          Copy
        </Button>
      </div>
    )}
  </TabsContent>
  // Access Control
  <TabsContent value="access">
    <Card>
      <CardHeader>
        <CardTitle>Bucket Access Control</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {buckets.map((bucket) => (
            <div key={bucket.name} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{bucket.name}</p>
                  <Badge variant={bucket.public ? 'default' : 'secondary'}>
                    {bucket.public ? 'Public' : 'Private'}
                  </Badge>
                </div>
                <Switch
                  checked={bucket.public}
                  onCheckedChange={(checked) =>
                    toggleBucketAccess(bucket.name, checked)
                  }
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => generateSignedUrl(bucket.name)}
              >
                Generate Signed URL
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </TabsContent>
  // CDN Configuration
  <TabsContent value="cdn">
    <Card>
      <CardHeader>
        <CardTitle>CDN Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>CDN Provider</Label>
            <Select value={cdnProvider} onValueChange={setCdnProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cloudflare">Cloudflare</SelectItem>
                <SelectItem value="fastly">Fastly</SelectItem>
                <SelectItem value="cloudfront">AWS CloudFront</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CDN URL</Label>
            <Input placeholder="https://cdn.example.com" />
          </div>
          <Button onClick={saveCdnConfig}>Save CDN Configuration</Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

**New API Routes Needed**:

- `/api/services/storage/preview` - GET image previews
- `/api/services/storage/batch` - POST batch operations
- `/api/services/storage/access` - POST access control
- `/api/services/storage/signed-url` - POST generate signed URL
- `/api/services/storage/cdn` - GET/POST CDN config

---

### /services/search-engine

**Required Enhancements** (lines 1413-1420):

1. **Index Statistics** - Document counts, index size, last updated
2. **Query Builder UI** - Visual query builder with filters and sorting
3. **Relevance Tuning** - Adjust ranking weights and boost factors
4. **Synonym Management** - Add/edit/delete synonyms

**Implementation Plan**:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="stats">Index Stats</TabsTrigger>
    <TabsTrigger value="search">Query Builder</TabsTrigger>
    <TabsTrigger value="relevance">Relevance Tuning</TabsTrigger>
    <TabsTrigger value="synonyms">Synonyms</TabsTrigger>
  </TabsList>
  // Index Statistics
  <TabsContent value="stats">
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <Database className="mb-2 h-8 w-8 text-blue-500" />
          <p className="text-sm text-zinc-500">Total Documents</p>
          <p className="text-3xl font-bold">
            {indexStats.docCount.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <HardDrive className="mb-2 h-8 w-8 text-green-500" />
          <p className="text-sm text-zinc-500">Index Size</p>
          <p className="text-3xl font-bold">{indexStats.size}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Clock className="mb-2 h-8 w-8 text-amber-500" />
          <p className="text-sm text-zinc-500">Last Updated</p>
          <p className="text-3xl font-bold">{indexStats.lastUpdated}</p>
        </CardContent>
      </Card>
    </div>
  </TabsContent>
  // Query Builder
  <TabsContent value="search">
    <Card>
      <CardHeader>
        <CardTitle>Visual Query Builder</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Search Query</Label>
            <Input
              placeholder="Enter search terms..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Filter By Field</Label>
              <Select value={filterField} onValueChange={setFilterField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={executeQuery}>
            <Search className="mr-2 h-4 w-4" />
            Execute Query
          </Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
  // Relevance Tuning
  <TabsContent value="relevance">
    <Card>
      <CardHeader>
        <CardTitle>Ranking & Relevance Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Title Weight</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[titleWeight]}
                onValueChange={(v) => setTitleWeight(v[0])}
                max={10}
                step={0.1}
              />
              <span className="w-12 font-mono text-sm">{titleWeight}</span>
            </div>
          </div>
          <div>
            <Label>Content Weight</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[contentWeight]}
                onValueChange={(v) => setContentWeight(v[0])}
                max={10}
                step={0.1}
              />
              <span className="w-12 font-mono text-sm">{contentWeight}</span>
            </div>
          </div>
          <Button onClick={saveRelevanceSettings}>Save Ranking Settings</Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
  // Synonyms
  <TabsContent value="synonyms">
    <Card>
      <CardHeader>
        <CardTitle>Synonym Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter synonym group (e.g., car,automobile,vehicle)"
              value={newSynonym}
              onChange={(e) => setNewSynonym(e.target.value)}
            />
            <Button onClick={addSynonym}>Add</Button>
          </div>
          <div className="space-y-2">
            {synonyms.map((group, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded border p-2"
              >
                <span className="font-mono text-sm">{group.join(', ')}</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteSynonym(idx)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

**New API Routes Needed**:

- `/api/services/search-engine/stats` - GET index statistics
- `/api/services/search-engine/query` - POST execute visual query
- `/api/services/search-engine/relevance` - GET/POST ranking settings
- `/api/services/search-engine/synonyms` - GET/POST/DELETE synonyms

---

### /services/mlflow

**Required Enhancements** (lines 1422-1429):

1. **Experiment Comparison** - Side-by-side comparison of 2+ experiments
2. **Model Deployment UI** - Deploy models to staging/production
3. **Artifact Browser** - Browse and download experiment artifacts
4. **Metrics Visualization** - Charts for training metrics over time

**Implementation Plan**:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="experiments">Experiments</TabsTrigger>
    <TabsTrigger value="compare">Compare</TabsTrigger>
    <TabsTrigger value="models">Model Registry</TabsTrigger>
    <TabsTrigger value="deploy">Deploy</TabsTrigger>
    <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
  </TabsList>
  // Experiment Comparison
  <TabsContent value="compare">
    <Card>
      <CardHeader>
        <CardTitle>Compare Experiments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-2">
          <Select value={compareExp1} onValueChange={setCompareExp1}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select experiment 1" />
            </SelectTrigger>
            <SelectContent>
              {experiments.map((exp) => (
                <SelectItem key={exp.id} value={exp.id}>
                  {exp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={compareExp2} onValueChange={setCompareExp2}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select experiment 2" />
            </SelectTrigger>
            <SelectContent>
              {experiments.map((exp) => (
                <SelectItem key={exp.id} value={exp.id}>
                  {exp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Experiment 1</TableHead>
              <TableHead>Experiment 2</TableHead>
              <TableHead>Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Accuracy</TableCell>
              <TableCell>0.945</TableCell>
              <TableCell>0.952</TableCell>
              <TableCell className="text-green-600">+0.007</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Loss</TableCell>
              <TableCell>0.123</TableCell>
              <TableCell>0.098</TableCell>
              <TableCell className="text-green-600">-0.025</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
  // Model Deployment
  <TabsContent value="deploy">
    <Card>
      <CardHeader>
        <CardTitle>Deploy Model</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Select Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} v{model.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Deploy To</Label>
            <Select value={deployEnv} onValueChange={setDeployEnv}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDeploy}>
            <Rocket className="mr-2 h-4 w-4" />
            Deploy Model
          </Button>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
  // Artifact Browser
  <TabsContent value="artifacts">
    <Card>
      <CardHeader>
        <CardTitle>Experiment Artifacts</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Artifact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {artifacts.map((artifact) => (
              <TableRow key={artifact.id}>
                <TableCell className="font-mono text-xs">
                  {artifact.path}
                </TableCell>
                <TableCell>
                  <Badge>{artifact.type}</Badge>
                </TableCell>
                <TableCell>{artifact.size}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadArtifact(artifact.id)}
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

**New API Routes Needed**:

- `/api/services/mlflow/compare` - POST compare experiments
- `/api/services/mlflow/deploy` - POST deploy model
- `/api/services/mlflow/artifacts` - GET list artifacts
- `/api/services/mlflow/artifact/:id/download` - GET download artifact

---

### /services/realtime

**Required Enhancements** (lines 1431-1438):

1. **Channel Analytics** - Message throughput, subscriber counts over time
2. **Message Replay** - Replay recent messages for debugging
3. **Presence Tracking UI** - Real-time online/offline user tracking
4. **Rate Limiting Config** - Configure message rate limits per channel

**Implementation Plan**:

```tsx
// Add new tabs to existing tabbed interface
<TabsList>
  <TabsTrigger value="channels">Channels</TabsTrigger>
  <TabsTrigger value="analytics">Analytics</TabsTrigger>
  <TabsTrigger value="replay">Message Replay</TabsTrigger>
  <TabsTrigger value="presence">Presence</TabsTrigger>
  <TabsTrigger value="ratelimit">Rate Limits</TabsTrigger>
</TabsList>

// Analytics Tab
<TabsContent value="analytics">
  <Card>
    <CardHeader><CardTitle>Channel Analytics</CardTitle></CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <Activity className="h-8 w-8 mb-2 text-blue-500" />
            <p className="text-sm text-zinc-500">Messages/sec</p>
            <p className="text-3xl font-bold">{messageRate}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Users className="h-8 w-8 mb-2 text-green-500" />
            <p className="text-sm text-zinc-500">Active Subscribers</p>
            <p className="text-3xl font-bold">{activeSubscribers}</p>
          </CardContent>
        </Card>
      </div>
      {/* Chart showing message throughput over time */}
      <div className="h-64 border rounded">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analyticsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="messages" stroke="#3b82f6" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
</TabsContent>

// Message Replay Tab
<TabsContent value="replay">
  <Card>
    <CardHeader><CardTitle>Message Replay</CardTitle></CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Channel</Label>
            <Select value={replayChannel} onValueChange={setReplayChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {channels.map(ch => (
                  <SelectItem key={ch.name} value={ch.name}>{ch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Time Range</Label>
            <Select value={replayRange} onValueChange={setReplayRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={loadMessageHistory}>
          <ScrollText className="mr-2 h-4 w-4" />
          Load Messages
        </Button>
        <ScrollArea className="h-96 border rounded p-4">
          {messageHistory.map((msg, idx) => (
            <div key={idx} className="mb-2 border-b pb-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{msg.timestamp}</span>
                <span>{msg.event}</span>
              </div>
              <pre className="text-xs mt-1">{JSON.stringify(msg.data, null, 2)}</pre>
            </div>
          ))}
        </ScrollArea>
      </div>
    </CardContent>
  </Card>
</TabsContent>

// Rate Limiting Tab
<TabsContent value="ratelimit">
  <Card>
    <CardHeader><CardTitle>Rate Limiting Configuration</CardTitle></CardHeader>
    <CardContent>
      <div className="space-y-4">
        {channels.map(channel => (
          <div key={channel.name} className="border rounded p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">{channel.name}</p>
              <Badge>{channel.type}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Messages/sec</Label>
                <Input
                  type="number"
                  value={channel.rateLimit}
                  onChange={(e) => updateRateLimit(channel.name, 'messages', e.target.value)}
                />
              </div>
              <div>
                <Label>Burst Size</Label>
                <Input
                  type="number"
                  value={channel.burstSize}
                  onChange={(e) => updateRateLimit(channel.name, 'burst', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
        <Button onClick={saveRateLimits}>
          Save Rate Limits
        </Button>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

**New API Routes Needed**:

- `/api/services/realtime/analytics` - GET channel analytics
- `/api/services/realtime/replay` - POST get message history
- `/api/services/realtime/presence/:channel` - GET online users
- `/api/services/realtime/ratelimit` - GET/POST rate limit config

---

### /services/scaffold

**Required Enhancements** (lines 1440-1447):

1. **Template Preview** - Code preview before scaffolding
2. **Customization Wizard** - Step-by-step template customization
3. **Post-Scaffold Setup Guide** - Instructions after scaffolding
4. **Template Marketplace Link** - Link to external template repository

**Implementation Plan**:

```tsx
// Enhance existing page with new features

// Add preview modal
const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)

<Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
  <DialogContent className="max-w-4xl">
    <DialogHeader>
      <DialogTitle>Template Preview: {previewTemplate?.name}</DialogTitle>
    </DialogHeader>
    <Tabs defaultValue="structure">
      <TabsList>
        <TabsTrigger value="structure">File Structure</TabsTrigger>
        <TabsTrigger value="code">Code Sample</TabsTrigger>
        <TabsTrigger value="config">Configuration</TabsTrigger>
      </TabsList>
      <TabsContent value="structure">
        <ScrollArea className="h-96">
          <pre className="text-xs">
            {previewTemplate?.structure}
          </pre>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="code">
        <ScrollArea className="h-96">
          <pre className="text-xs">
            {previewTemplate?.sampleCode}
          </pre>
        </ScrollArea>
      </TabsContent>
      <TabsContent value="config">
        <ScrollArea className="h-96">
          <pre className="text-xs">
            {previewTemplate?.config}
          </pre>
        </ScrollArea>
      </TabsContent>
    </Tabs>
    <DialogFooter>
      <Button onClick={() => useTemplate(previewTemplate)}>
        Use This Template
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Add preview button to template cards
<Button
  variant="ghost"
  size="sm"
  onClick={(e) => {
    e.stopPropagation()
    setPreviewTemplate(template)
  }}
>
  <Eye className="mr-2 h-4 w-4" />
  Preview
</Button>

// Add customization wizard
const [wizardStep, setWizardStep] = useState(0)
const wizardSteps = [
  { title: 'Choose Template', component: <TemplateSelector /> },
  { title: 'Configure', component: <TemplateConfig /> },
  { title: 'Review', component: <TemplateReview /> },
  { title: 'Scaffold', component: <ScaffoldProgress /> },
]

<Dialog open={showWizard} onOpenChange={setShowWizard}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Service Scaffolding Wizard</DialogTitle>
      <div className="flex items-center gap-2 mt-4">
        {wizardSteps.map((step, idx) => (
          <div key={idx} className="flex-1">
            <div className={`h-1 rounded ${idx <= wizardStep ? 'bg-blue-500' : 'bg-zinc-200'}`} />
            <p className="text-xs mt-1">{step.title}</p>
          </div>
        ))}
      </div>
    </DialogHeader>
    <div className="py-4">
      {wizardSteps[wizardStep].component}
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => setWizardStep(Math.max(0, wizardStep - 1))}
        disabled={wizardStep === 0}
      >
        Previous
      </Button>
      <Button
        onClick={() => setWizardStep(Math.min(wizardSteps.length - 1, wizardStep + 1))}
        disabled={wizardStep === wizardSteps.length - 1}
      >
        Next
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Add post-scaffold guide
const [scaffoldComplete, setScaffoldComplete] = useState(false)
const [setupSteps, setSetupSteps] = useState([
  { title: 'Install dependencies', command: 'npm install', completed: false },
  { title: 'Configure environment', command: 'cp .env.example .env', completed: false },
  { title: 'Start development server', command: 'npm run dev', completed: false },
])

<Dialog open={scaffoldComplete} onOpenChange={setScaffoldComplete}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Scaffold Complete!</DialogTitle>
      <DialogDescription>
        Your service has been scaffolded. Follow these steps to get started:
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-3">
      {setupSteps.map((step, idx) => (
        <div key={idx} className="flex items-start gap-3">
          <Checkbox
            checked={step.completed}
            onCheckedChange={(checked) => {
              const newSteps = [...setupSteps]
              newSteps[idx].completed = !!checked
              setSetupSteps(newSteps)
            }}
          />
          <div className="flex-1">
            <p className="font-medium text-sm">{step.title}</p>
            <code className="text-xs bg-zinc-100 px-2 py-1 rounded">
              {step.command}
            </code>
          </div>
        </div>
      ))}
    </div>
    <DialogFooter>
      <Button asChild>
        <a href="https://templates.nself.dev" target="_blank">
          Browse More Templates
        </a>
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Add marketplace link to header
<Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="font-semibold">Need more templates?</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Browse 100+ community templates
        </p>
      </div>
      <Button asChild>
        <a href="https://templates.nself.dev" target="_blank">
          <ExternalLink className="mr-2 h-4 w-4" />
          Visit Marketplace
        </a>
      </Button>
    </div>
  </CardContent>
</Card>
```

**New API Routes Needed**:

- `/api/services/scaffold/preview` - POST get template preview
- `/api/services/scaffold/validate` - POST validate service name

---

## Implementation Checklist

For each service page, complete these steps:

1. **Create Enhanced Page**
   - [ ] Add Tabs component with all required tabs
   - [ ] Implement stats/metrics cards
   - [ ] Add service-specific features
   - [ ] Ensure responsive design

2. **Create API Routes**
   - [ ] Create all required API route files
   - [ ] Implement CLI delegation (call `nself service <name> <command>`)
   - [ ] Add proper error handling
   - [ ] Return standardized JSON response

3. **Test Functionality**
   - [ ] Test all tabs and features
   - [ ] Verify CLI commands execute correctly
   - [ ] Check error states
   - [ ] Test responsive behavior

4. **Code Quality**
   - [ ] Run `pnpm run lint` - must have 0 errors
   - [ ] Run `pnpm run format` - auto-format all files
   - [ ] Run `pnpm run type-check` - must pass
   - [ ] Remove unused imports
   - [ ] Fix any ESLint warnings

---

## Standard Service Page Template

Every service page should follow this structure:

```tsx
'use client'

import { PageShell } from '@/components/PageShell'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
// ... other imports

export default function ServicePage() {
  const [activeTab, setActiveTab] = useState('overview')
  // ... state

  return (
    <PageShell
      title="Service Name"
      description="Service description with key features"
      actions={/* Action buttons */}
    >
      {/* Error/Success Banners */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>{/* Tabs based on service features */}</TabsList>

        {/* Tab Contents */}
        <TabsContent value="overview">
          {/* Stats cards */}
          {/* Main functionality */}
        </TabsContent>

        {/* Additional tabs */}
      </Tabs>

      {/* CLI Output (always at bottom) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>CLI Command</CardTitle>
        </CardHeader>
        <CardContent>
          <pre>$ {lastCommand}</pre>
          <pre>{output}</pre>
        </CardContent>
      </Card>
    </PageShell>
  )
}
```

---

## Next Steps

1. Complete /services/email enhancements
2. Complete /services/cache enhancements
3. Complete /services/storage enhancements
4. Complete /services/search-engine enhancements
5. Complete /services/mlflow enhancements
6. Complete /services/realtime enhancements (existing page already has good structure)
7. Complete /services/scaffold enhancements (existing page already has good structure)
8. Run final lint/format/type-check
9. Test all pages end-to-end
10. Update V0.5-GRANULAR-PLAN.md to mark items as complete

---

## Reference Links

- **V0.5 Granular Plan**: `/docs/V0.5-GRANULAR-PLAN.md` lines 1376-1448
- **Standard Template**: Lines 1299-1333 of plan
- **Existing Components**: `/src/components/ui/`
- **Functions Page (Example)**: `/src/app/services/functions/page.tsx`
