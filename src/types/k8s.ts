/**
 * Kubernetes & Helm Types for nself-admin v0.0.8
 */

export type K8sPlatform =
  | 'eks'
  | 'gke'
  | 'aks'
  | 'doks'
  | 'lke'
  | 'vke'
  | 'sks'
  | 'ack'
  | 'tke'
  | 'mks'
  | 'oke'
  | 'iks'
  | 'k3s'
  | 'minikube'
  | 'kind'

export interface K8sCluster {
  name: string
  context: string
  platform: K8sPlatform
  apiServer: string
  namespace: string
  status: 'connected' | 'disconnected' | 'error'
  version?: string
  nodes?: number
  current: boolean
}

export interface K8sNamespace {
  name: string
  status: 'Active' | 'Terminating'
  createdAt: string
  labels?: Record<string, string>
  resourceCounts?: {
    deployments: number
    pods: number
    services: number
  }
}

export interface K8sDeployment {
  name: string
  namespace: string
  replicas: {
    desired: number
    ready: number
    available: number
    updated: number
  }
  strategy: string
  image: string
  createdAt: string
  conditions: K8sCondition[]
}

export interface K8sPod {
  name: string
  namespace: string
  status: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown'
  ready: string
  restarts: number
  age: string
  ip?: string
  node?: string
  containers: K8sContainer[]
}

export interface K8sContainer {
  name: string
  image: string
  ready: boolean
  restartCount: number
  state: 'running' | 'waiting' | 'terminated'
  lastState?: string
}

export interface K8sCondition {
  type: string
  status: 'True' | 'False' | 'Unknown'
  reason?: string
  message?: string
  lastTransitionTime: string
}

export interface K8sService {
  name: string
  namespace: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName'
  clusterIP: string
  externalIP?: string
  ports: { name?: string; port: number; targetPort: number; protocol: string }[]
  selector?: Record<string, string>
  createdAt: string
}

export interface K8sIngress {
  name: string
  namespace: string
  className?: string
  hosts: string[]
  paths: { path: string; service: string; port: number }[]
  tls?: { hosts: string[]; secretName: string }[]
  createdAt: string
}

export interface K8sManifest {
  filename: string
  kind: string
  name: string
  content: string
}

export interface K8sConvertOptions {
  namespace: string
  outputDir: string
  replicas: number
  imageTag?: string
  ingressEnabled: boolean
  ingressClassName?: string
}

// Helm Types
export interface HelmRelease {
  name: string
  namespace: string
  revision: number
  status:
    | 'deployed'
    | 'pending-install'
    | 'pending-upgrade'
    | 'pending-rollback'
    | 'failed'
    | 'uninstalling'
  chart: string
  chartVersion: string
  appVersion: string
  updatedAt: string
  description?: string
}

export interface HelmChart {
  name: string
  version: string
  appVersion: string
  description: string
  home?: string
  sources?: string[]
  keywords?: string[]
  maintainers?: { name: string; email?: string; url?: string }[]
  dependencies?: { name: string; version: string; repository: string }[]
}

export interface HelmRepo {
  name: string
  url: string
  lastUpdated?: string
}

export interface HelmValues {
  content: string
  environment?: string
  overrides?: Record<string, unknown>
}

export interface HelmInstallOptions {
  releaseName: string
  namespace: string
  chart: string
  values?: Record<string, unknown>
  valuesFile?: string
  dryRun?: boolean
  wait?: boolean
  timeout?: string
}

export interface HelmRollbackOptions {
  releaseName: string
  namespace: string
  revision: number
  dryRun?: boolean
  wait?: boolean
}
