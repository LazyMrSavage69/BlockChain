📜 Digital Contracts Platform




[
]

A distributed microservices-based web application for creating, managing, and signing digital contracts with blockchain verification. This platform combines traditional web technologies with blockchain to provide secure, verifiable, and transparent contract management.

🌟 Features

Create and manage digital contracts

Sign contracts digitally with blockchain verification

Distributed microservices architecture

Secure, verifiable, and transparent contract storage

🌿 Branches
Branch	Description	Notes
main	Initial microservices version without Docker	Development paused
docker-changes	Updated with Docker Compose	Recommended for testing
kubernetes/azure	Kubernetes deployment for Azure	Requires Docker + K8s

Note: Docker is required for both docker-changes and kubernetes/azure branches.

🛠️ Technologies

Backend: Node.js / Express.js, GoLang, Spring Boot (depending on microservice)

Frontend: React / Next.js

Blockchain: Solidity / Smart contracts

Database: PostgreSQL / MySQL

Containerization: Docker, Docker Compose

Deployment: Kubernetes (Azure optional)

⚡ Installation & Running
1. Clone the repository
git clone https://github.com/your-username/project-name.git
cd project-name

2. Switch to the Docker branch
git checkout docker-changes

3. Run with Docker Compose
docker-compose up --build


The application should now be accessible at http://localhost:3000 (or your configured port).

For Kubernetes deployment, switch to the kubernetes/azure branch and follow the instructions in that folder.

📌 Notes

This repository’s main branch is legacy; all active development is in docker-changes or kubernetes/azure.

Docker is required to run the project properly.

For blockchain verification, make sure your smart contracts are deployed or use the provided local test network.

🤝 Contributing

Contributions are welcome! Please create an issue or a pull request for any improvements or bug fixes.

📄 License

This project is licensed under the MIT License
