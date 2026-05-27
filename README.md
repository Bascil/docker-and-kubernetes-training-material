# Kubernetes Hands-on Lab: K3s + Node.js + MySQL + Docker Hub + Kustomize

---

## Overview

This lab builds a complete end-to-end Kubernetes system using K3s:

- Node.js backend (Docker Hub image)
- MySQL database (inside cluster)
- Kubernetes Deployments & Services
- Kustomize structure
- External access via NodePort (30080)
- No port-forward required

---

## Architecture

Browser → NodePort (30080) → Node.js Backend → MySQL Service → MySQL Pod

---

## 1. Install K3s

```bash
curl -sfL https://get.k3s.io | sh -
```

---

## 2. Configure kubectl

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER:$USER ~/.kube/config
chmod 600 ~/.kube/config
```

```bash
echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
source ~/.bashrc
```

```bash
kubectl get nodes
```

---

## 3. Project Structure

```bash
k8s-lab/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── index.js
│
└── k8s/
    └── base/
        ├── namespace.yaml
        ├── mysql/
        │   ├── deployment.yaml
        │   ├── service.yaml
        │   └── kustomization.yaml
        │
        ├── backend/
        │   ├── deployment.yaml
        │   ├── service.yaml
        │   └── kustomization.yaml
        │
        └── kustomization.yaml
```

---

## 4. Backend App

### index.js
```javascript
const http = require('http');
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'mysql',
  user: 'appuser',
  password: 'apppass',
  database: 'appdb'
});

http.createServer((req, res) => {
  db.query('SELECT NOW() as now', (err, result) => {
    if (err) return res.end('DB error');
    res.end('Backend OK | MySQL: ' + result[0].now);
  });
}).listen(3000);
```

---

### package.json
```json
{
  "name": "backend",
  "version": "1.0.0",
  "dependencies": {
    "mysql2": "^3.6.0"
  }
}
```

---

### Dockerfile
```dockerfile
FROM node:latest
WORKDIR /app
COPY package.json .
RUN npm install
COPY index.js .
CMD ["node", "index.js"]
```

---

## 5. Build & Push to Docker Hub

```bash
docker login

docker build -t DOCKERHUB_USERNAME/backend:v1 ./backend

docker push DOCKERHUB_USERNAME/backend:v1
```

---

## 6. Kubernetes Manifests

---

### Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo
```

---

## MYSQL

### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
        - name: mysql
          image: mysql:8
          env:
            - name: MYSQL_DATABASE
              value: appdb
            - name: MYSQL_USER
              value: appuser
            - name: MYSQL_PASSWORD
              value: apppass
            - name: MYSQL_ROOT_PASSWORD
              value: rootpass
          ports:
            - containerPort: 3306
```

### service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: demo
spec:
  selector:
    app: mysql
  ports:
    - port: 3306
```

---

## BACKEND

### deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: demo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: DOCKERHUB_USERNAME/backend:v1
          ports:
            - containerPort: 3000
```

### service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: demo
spec:
  type: NodePort
  selector:
    app: backend
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 30080
```

---

## 7. Kustomize

### base/kustomization.yaml
```yaml
resources:
  - namespace.yaml
  - mysql
  - backend
```

### mysql/kustomization.yaml
```yaml
resources:
  - deployment.yaml
  - service.yaml
```

### backend/kustomization.yaml
```yaml
resources:
  - deployment.yaml
  - service.yaml
```

---

## 8. Deploy

```bash
kubectl apply -k k8s/base
```

---

## 9. Verify

```bash
kubectl get pods -n demo
kubectl get svc -n demo
```

---

## 10. Access App

```bash
kubectl get nodes -o wide
```

Open:

http://NODE-IP:30080

---

## Expected Output

Backend OK | MySQL: timestamp

---

## Cleanup

```bash
kubectl delete -k k8s/base
```

---

## Key Learning

- K3s cluster setup
- Kubernetes core objects
- Service discovery (mysql DNS)
- Container build & registry workflow
- NodePort exposure
- Kustomize structure
