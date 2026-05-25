# Senior DevOps / Platform Engineer Challenge: WebSockets on Kubernetes

This repository contains the complete solution for deploying, automating, and monitoring a highly available WebSocket service within a Kubernetes cluster. The entire architecture is designed following production-grade standards for fault tolerance, immutability, and native cloud observability.

## 🚀 System Architecture

The solution addresses classic WebSocket protocol challenges (long-lived, persistent connections) in distributed environments using the following edge network topology:

1. **Edge Ingress (Nginx):** Acts as the perimeter router intercepting the `websocket.local` domain. It configures advanced directives to optimize memory buffering and bidirectional streaming while extending timeouts to avoid unwanted disconnections caused by client inactivity.
2. **Kubernetes Service (ClusterIP):** A stable Layer 4 internal balancer and DNS that unifies dynamic replicas and distributes incoming TCP handshakes.
3. **Deployment (3 Replicas):** Guarantees high availability and elastic scaling using controlled update strategies and infrastructure health probes.

---

## 📦 Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yaml         # CI/CD Pipeline (GitHub Actions)
├── k8s/                        # Declarative Kubernetes Manifests
│   ├── configmap.yaml          # Environment configuration variables
│   ├── deployment.yaml         # Workload definitions and application replicas
│   ├── ingress.yaml            # Routing rules and custom network timeout policies
│   ├── service.yaml            # Internal load balancer (ClusterIP)
│   └── servicemonitor.yaml     # Prometheus Operator CRD for dynamic scraping
├── .dockerignore               # Security guard for the build context
├── Dockerfile                  # Optimized and secure multi-stage container build
├── server.js                   # Native Node.js WebSocket server with HTTP endpoints
├── test-connections.js         # Simulation and high-concurrency stress test script
└── package.json                # Dependencies manifest and Node.js execution scripts
🛠️ Architecture Details by Layer
1. Application Layer (server.js)
Technology Stack: Asynchronous Node.js using the native ws library, ensuring an ultra-lightweight container runtime without the overhead of heavy, monolithic frameworks.

Integrated Telemetry & Infrastructure Endpoints:

/healthz Endpoint: Exposes a native HTTP server to verify the health status of the JavaScript Event Loop.

/metrics Endpoint: Integrated with prom-client to expose native runtime and custom business metrics (e.g., websocket_active_connections).

2. Containerization Layer (Dockerfile & .dockerignore)
Layer Caching Strategy: Recursive copying of package*.json prior to copying application source code to dramatically speed up runner execution times during the pipeline.

Security (Principle of Least Privilege): Uses the official node:22-alpine minimal base image to significantly reduce the attack surface. It explicitly enforces non-root execution by binding runtime processes to the unprivileged USER node.

Performance Tuning: Runs via npm ci --only=production and enables environment optimizations via NODE_ENV=production. Uses the Exec Form (CMD ["node", "server.js"]), ensuring Node.js runs as PID 1 to correctly intercept and handle kernel SIGTERM signals sent by Kubernetes during downscaling.

3. Infrastructure Layer (k8s/)
Zero Downtime (deployment.yaml): Configured with a RollingUpdate strategy using strict boundaries (maxUnavailable: 0 and maxSurge: 1). This guarantees no old Pod is terminated until new replicas are 100% healthy.

Persistent Connection Management: Elevated terminationGracePeriodSeconds to 90 seconds to facilitate a true Graceful Shutdown (connection draining), giving the application enough time to inform clients and close sockets cleanly.

Robust Probes: Implemented Layer 7 livenessProbe and readinessProbe pointing to /healthz via httpGet. This ensures Kubernetes checks actual application responsiveness rather than just verifying that the TCP port is open.

Strict Hardware Allocation: Implements exact compute resource profiles (limits.memory: 256Mi, requests.cpu: 250m) to shield cluster nodes against sudden memory exhaustion during massive TCP handshake spikes.

Bypass of Default Ingress Timeouts (ingress.yaml): Injected critical annotations tailored for ingress-nginx:

YAML
nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
nginx.ingress.kubernetes.io/websocket-services: "websocket-server"
This keeps active duplex channels open continuously for up to 1 hour and optimizes buffer sizes for long-lived streams.

🔄 Automation Pipeline (CI/CD via GitHub Actions)
The workflow defined in .github/workflows/deploy.yaml enforces automated Continuous Integration and Delivery triggered by code push events to the main branch.

Immutable Image Tagging Strategy: Completely avoids the anti-pattern of using the :latest tag in automation. The pipeline dynamically extracts the first 7 characters of the Git commit hash (${{ github.sha }}) to enforce an immutable, traceable tagging system.

Credential Protection: Secured authentication to the Container Registry using GitHub Encrypted Secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN).

Post-Deployment Validation: For independent local workflows, the pipeline tests deployment integrity and syntactic correctness out-of-band using:

Bash
kubectl apply -f k8s/ --dry-run=client --validate=false
Followed by an automated deployment rollout verification script:

Bash
kubectl rollout status deployment/websocket-server --timeout=90s
📊 Observability & Monitoring (Prometheus + Grafana)
To provide deep, real-time visibility into system behavior under load, a native cloud-observability stack was deployed:

Helm-Driven Installation: Automatic provisioning of the official kube-prometheus-stack operator within a isolated monitoring namespace.

Dynamic Service Discovery (Scraping): Configured mutual discovery discovery targets within service.yaml and servicemonitor.yaml to tell Prometheus exactly where and how frequently to scrape WebSocket telemetries.

Grafana Canvas Dashboard: Designed an interactive, high-fidelity live visualization using Grafana's native Canvas panel. The layout maps out the live network topology (Ingress Controller -> Service -> Pods) and embeds live PromQL expressions to output real-time concurrent connection metrics directly inside each dynamic Pod object.

💻 Local Deployment & Testing Guide
To reproduce and validate this entire infrastructure cluster configuration locally on a Windows / VS Code environment, execute the following commands inside a PowerShell terminal:

1. Initialize Infrastructure Components
Ensure Docker Desktop is active ("Engine Running") and initialize the local cluster using Minikube backed by the Docker hypervisor driver:

PowerShell
minikube start --driver=docker
2. Enable Ingress Controller & Network Tunneling
Enable Nginx capabilities inside the cluster and spin up the edge network routing bridge (Tunnel) in a dedicated terminal window (keep this console open):

PowerShell
minikube addons enable ingress
minikube tunnel
3. Configure Local DNS Resolution on Windows
Retrieve your cluster's virtual IP (minikube ip) and append a static entry to your Windows local hosts file (C:\Windows\System32\drivers\etc\hosts) running your text editor as Administrator:

Plaintext
192.168.58.2  websocket.local
4. Build and Deploy the Complete Stack
Compile the Docker image, sideload it directly into Minikube's internal image store to completely avoid external pull delays, and apply the declarative manifests folder:

PowerShell
docker build -t websocket-challenge:latest .
minikube image load websocket-challenge:latest
kubectl apply -f k8s/
5. Validate Rollout and Run High-Concurrency Stress Tests
Audit your deployment to verify all 3 application Pods transition successfully into a Running (1/1) state and the Ingress resource inherits the correct cluster IP:

PowerShell
kubectl get all,ingress
Launch a separate terminal session and run the automated load injector to spin up 15 parallel connections concurrently hitting the Kubernetes edge Ingress endpoint:

PowerShell
node test-connections.js
You can monitor connection behaviors and traffic metrics instantly by browsing your local Prometheus targets or loading your live Canvas layout inside Grafana (http://localhost:3000).
