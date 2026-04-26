# Kubernetes Deployment

Deploy nself Admin to Kubernetes for production environments with high availability and scalability.

## Overview

This guide covers deploying nself Admin on Kubernetes with:

- **Deployment** manifests for the application
- **Service** definitions for networking
- **ConfigMap** and **Secret** management
- **Persistent Volume** for data storage
- **Ingress** configuration for external access

## Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured for your cluster
- Docker images available in registry
- Storage class for persistent volumes

## Deployment Manifests

### Namespace

Create a dedicated namespace:

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nself-admin
  labels:
    app: nself-admin
```

### ConfigMap

Application configuration:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nself-admin-config
  namespace: nself-admin
data:
  NODE_ENV: 'production'
  PORT: '3021'
  # Add other non-sensitive configuration
```

### Secret

Sensitive configuration:

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nself-admin-secrets
  namespace: nself-admin
type: Opaque
data:
  # Base64 encoded values
  ADMIN_PASSWORD_HASH: <base64-encoded-hash>
  JWT_SECRET: <base64-encoded-secret>
```

### Persistent Volume Claim

Data storage for the database:

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nself-admin-data
  namespace: nself-admin
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: fast-ssd # Adjust based on your storage class
```

### Deployment

Main application deployment:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nself-admin
  namespace: nself-admin
  labels:
    app: nself-admin
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nself-admin
  template:
    metadata:
      labels:
        app: nself-admin
    spec:
      containers:
        - name: nself-admin
          image: nself/nself-admin:0.0.8
          ports:
            - containerPort: 3021
              name: http
          env:
            - name: NODE_ENV
              valueFrom:
                configMapKeyRef:
                  name: nself-admin-config
                  key: NODE_ENV
            - name: PORT
              valueFrom:
                configMapKeyRef:
                  name: nself-admin-config
                  key: PORT
            - name: ADMIN_PASSWORD_HASH
              valueFrom:
                secretKeyRef:
                  name: nself-admin-secrets
                  key: ADMIN_PASSWORD_HASH
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: nself-admin-secrets
                  key: JWT_SECRET
          volumeMounts:
            - name: data
              mountPath: /app/data
            - name: workspace
              mountPath: /workspace
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3021
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3021
            initialDelaySeconds: 5
            periodSeconds: 5
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: nself-admin-data
        - name: workspace
          emptyDir: {} # Or mount your project data
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
```

### Service

Expose the application:

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nself-admin-service
  namespace: nself-admin
  labels:
    app: nself-admin
spec:
  selector:
    app: nself-admin
  ports:
    - name: http
      port: 80
      targetPort: 3021
      protocol: TCP
  type: ClusterIP
```

### Ingress

External access configuration:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nself-admin-ingress
  namespace: nself-admin
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
spec:
  tls:
    - hosts:
        - admin.yourdomain.com
      secretName: nself-admin-tls
  rules:
    - host: admin.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nself-admin-service
                port:
                  number: 80
```

## Deployment Commands

### Apply Manifests

Deploy all components:

```bash
# Create namespace
kubectl apply -f namespace.yaml

# Apply configuration
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# Create storage
kubectl apply -f pvc.yaml

# Deploy application
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### Verify Deployment

Check deployment status:

```bash
# Check pods
kubectl get pods -n nself-admin

# Check services
kubectl get svc -n nself-admin

# Check ingress
kubectl get ingress -n nself-admin

# View logs
kubectl logs -n nself-admin deployment/nself-admin

# Describe deployment
kubectl describe deployment nself-admin -n nself-admin
```

## High Availability Setup

### Multiple Replicas

Scale for high availability:

```yaml
# In deployment.yaml
spec:
  replicas: 3 # Increase replicas
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

### Pod Disruption Budget

Ensure availability during maintenance:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: nself-admin-pdb
  namespace: nself-admin
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: nself-admin
```

### Node Anti-Affinity

Spread pods across nodes:

```yaml
# Add to deployment.yaml template spec
spec:
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchExpressions:
                - key: app
                  operator: In
                  values:
                    - nself-admin
            topologyKey: kubernetes.io/hostname
```

## Scaling

### Horizontal Pod Autoscaler

Automatic scaling based on metrics:

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nself-admin-hpa
  namespace: nself-admin
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nself-admin
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Vertical Pod Autoscaler

Automatic resource adjustment:

```yaml
# vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: nself-admin-vpa
  namespace: nself-admin
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nself-admin
  updatePolicy:
    updateMode: 'Auto'
  resourcePolicy:
    containerPolicies:
      - containerName: nself-admin
        maxAllowed:
          cpu: 1
          memory: 1Gi
        minAllowed:
          cpu: 100m
          memory: 128Mi
```

## Monitoring

### ServiceMonitor for Prometheus

Monitor with Prometheus:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: nself-admin-monitor
  namespace: nself-admin
  labels:
    app: nself-admin
spec:
  selector:
    matchLabels:
      app: nself-admin
  endpoints:
    - port: http
      interval: 30s
      path: /api/metrics
```

### Dashboard

Grafana dashboard configuration:

```yaml
# dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nself-admin-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: '1'
data:
  nself-admin.json: |
    {
      "dashboard": {
        "title": "nself Admin",
        "panels": [
          {
            "title": "HTTP Requests",
            "type": "graph",
            "targets": [
              {
                "expr": "rate(http_requests_total[5m])"
              }
            ]
          }
        ]
      }
    }
```

## Security

### RBAC

Service account and permissions:

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: nself-admin
  namespace: nself-admin
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: nself-admin-role
  namespace: nself-admin
rules:
  - apiGroups: ['']
    resources: ['configmaps', 'secrets']
    verbs: ['get', 'list']
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: nself-admin-binding
  namespace: nself-admin
subjects:
  - kind: ServiceAccount
    name: nself-admin
    namespace: nself-admin
roleRef:
  kind: Role
  name: nself-admin-role
  apiGroup: rbac.authorization.k8s.io
```

### Network Policies

Restrict network access:

```yaml
# networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: nself-admin-netpol
  namespace: nself-admin
spec:
  podSelector:
    matchLabels:
      app: nself-admin
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3021
  egress:
    - to: []
      ports:
        - protocol: TCP
          port: 53
        - protocol: UDP
          port: 53
    - to: []
      ports:
        - protocol: TCP
          port: 443
```

### Pod Security Context

Enhanced security settings:

```yaml
# Add to deployment.yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: nself-admin
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: cache
              mountPath: /.next
      volumes:
        - name: tmp
          emptyDir: {}
        - name: cache
          emptyDir: {}
```

## Backup and Recovery

### Database Backup

Backup configuration data:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nself-admin-backup
  namespace: nself-admin
spec:
  schedule: '0 2 * * *' # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: alpine:latest
              command:
                - /bin/sh
                - -c
                - |
                  apk add --no-cache tar gzip
                  cd /app/data
                  tar -czf /backup/nself-admin-$(date +%Y%m%d-%H%M%S).tar.gz .
                  # Upload to S3 or other storage
              volumeMounts:
                - name: data
                  mountPath: /app/data
                  readOnly: true
                - name: backup
                  mountPath: /backup
          volumes:
            - name: data
              persistentVolumeClaim:
                claimName: nself-admin-data
            - name: backup
              persistentVolumeClaim:
                claimName: backup-storage
          restartPolicy: OnFailure
```

### Disaster Recovery

Recovery procedures:

```bash
# Backup current data
kubectl exec -n nself-admin deployment/nself-admin -- tar -czf /tmp/backup.tar.gz /app/data

# Copy backup locally
kubectl cp nself-admin/$(kubectl get pods -n nself-admin -l app=nself-admin -o jsonpath="{.items[0].metadata.name}"):/tmp/backup.tar.gz ./backup.tar.gz

# Restore from backup
kubectl cp ./backup.tar.gz nself-admin/$(kubectl get pods -n nself-admin -l app=nself-admin -o jsonpath="{.items[0].metadata.name}"):/tmp/restore.tar.gz
kubectl exec -n nself-admin deployment/nself-admin -- tar -xzf /tmp/restore.tar.gz -C /
```

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
| -------------------------- | ---------------------- | ------------------------------------------ |
| Pods not starting | Resource constraints | Check resource limits and node capacity |
| Database connection errors | Wrong configuration | Verify ConfigMap and Secret values |
| Ingress not working | DNS/certificate issues | Check DNS records and certificate status |
| High memory usage | Memory leaks | Monitor and restart pods if necessary |
| Slow performance | Resource limits | Increase CPU/memory limits or add replicas |

### Debugging Commands

```bash
# Pod status and events
kubectl describe pod -n nself-admin <pod-name>

# Application logs
kubectl logs -n nself-admin deployment/nself-admin --tail=100

# Resource usage
kubectl top pods -n nself-admin

# Network connectivity
kubectl exec -n nself-admin deployment/nself-admin -- nslookup kubernetes.default

# Storage issues
kubectl describe pvc -n nself-admin nself-admin-data

# Ingress status
kubectl describe ingress -n nself-admin nself-admin-ingress
```

## Best Practices

### Resource Management

1. **Set Resource Limits** - Always define CPU and memory limits
2. **Use Requests** - Set appropriate resource requests
3. **Monitor Usage** - Regularly check actual resource usage
4. **Plan Capacity** - Plan for peak load scenarios

### Security

1. **Use Secrets** - Never put sensitive data in ConfigMaps
2. **Network Policies** - Implement network segmentation
3. **RBAC** - Use minimal required permissions
4. **Security Context** - Run as non-root user
5. **Image Security** - Scan images for vulnerabilities

### Operations

1. **Health Checks** - Implement proper health check endpoints
2. **Graceful Shutdown** - Handle SIGTERM signals properly
3. **Logging** - Use structured logging
4. **Monitoring** - Monitor application and infrastructure metrics
5. **Backup Strategy** - Regular backups and tested recovery procedures

---

For more information, see:

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Charts](https://helm.sh/docs/)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Docker Deployment Guide](Docker.md)
