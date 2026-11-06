pipeline {
  agent { label 'linux-docker' }

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
    timeout(time: 90, unit: 'MINUTES')
  }

  parameters {
    booleanParam(name: 'DEPLOY_QA', defaultValue: false, description: 'Despliega QA en la VM de AWS y ejecuta pruebas dinamicas.')
    booleanParam(name: 'DEPLOY_FINAL', defaultValue: false, description: 'Solicita aprobacion y despliega el entorno final.')
    booleanParam(name: 'ENABLE_SONAR', defaultValue: false, description: 'Requiere servidor SonarQube y sonar-scanner en el agente.')
    booleanParam(name: 'ENABLE_DEPENDENCY_CHECK', defaultValue: false, description: 'Requiere Docker, imagen OWASP Dependency-Check y credencial nvd-api-key.')
    booleanParam(name: 'ENABLE_FORTIFY', defaultValue: false, description: 'Requiere Fortify SCA licenciado instalado en el agente.')
    booleanParam(name: 'ENABLE_CYPRESS', defaultValue: false, description: 'Ejecuta Cypress contra QA mediante cypress/included.')
    booleanParam(name: 'ENABLE_MAESTRO', defaultValue: false, description: 'Ejecuta Maestro con un emulador o dispositivo disponible.')
    booleanParam(name: 'ENABLE_DAST', defaultValue: false, description: 'Ejecuta ZAP baseline contra QA.')
    booleanParam(name: 'ENABLE_PERFORMANCE', defaultValue: false, description: 'Ejecuta k6 contra QA.')
    booleanParam(name: 'ENABLE_PULUMI_PREVIEW', defaultValue: false, description: 'Ejecuta pulumi preview con una sesion AWS valida; nunca aplica cambios.')
    string(name: 'QA_BASE_URL', defaultValue: 'http://127.0.0.1:8080', description: 'URL publica de QA para pruebas dinamicas.')
    string(name: 'QA_SSH_HOST', defaultValue: '', description: 'IP o DNS publico de la VM QA.')
    string(name: 'QA_SSH_USER', defaultValue: 'ubuntu', description: 'Usuario SSH de la VM QA (Ubuntu en AWS).')
    string(name: 'FINAL_BASE_URL', defaultValue: '', description: 'URL publica del entorno final.')
    string(name: 'FINAL_SSH_HOST', defaultValue: '', description: 'IP o DNS publico de la VM final.')
    string(name: 'FINAL_SSH_USER', defaultValue: 'ubuntu', description: 'Usuario SSH de la VM final (Ubuntu en AWS).')
  }

  environment {
    COMPOSE_BAKE = 'false'
    CI = 'true'
    NPM_CONFIG_FUND = 'false'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD'
      }
    }

    stage('Pulumi Validate') {
      steps {
        dir('infrastructure/pulumi') {
          // No AWS credentials are needed to install dependencies and typecheck
          // the program. The preview/update require an authenticated AWS session
          // and explicit approval before `pulumi up`.
          sh 'npm ci --no-audit --no-fund'
          sh 'npm run typecheck'
        }
      }
    }

    stage('Pulumi Preview') {
      when { expression { params.ENABLE_PULUMI_PREVIEW } }
      steps {
        withCredentials([file(credentialsId: 'pulumi-config-passphrase', variable: 'PULUMI_CONFIG_PASSPHRASE_FILE')]) {
          dir('infrastructure/pulumi') {
            sh '''
              command -v pulumi >/dev/null || {
                echo "pulumi no esta instalado en el agente linux-docker"
                exit 1
              }
              command -v aws >/dev/null || {
                echo "aws CLI no esta instalado en el agente linux-docker"
                exit 1
              }
              # Exporta credenciales temporales de la sesion AWS del agente sin
              # imprimirlas. No se usan claves de acceso permanentes.
              eval "$(aws configure export-credentials --profile "${AWS_PROFILE:-default}" --format env)"
              pulumi stack select qa
              pulumi preview --non-interactive --diff
            '''
          }
        }
      }
    }

    stage('Dependencies') {
      steps {
        dir('backend') { sh 'npm ci' }
        dir('frontend') { sh 'npm ci' }
      }
    }

    stage('Lint') {
      steps {
        dir('backend') { sh 'npm run lint' }
        dir('frontend') { sh 'npm run lint' }
      }
    }

    stage('Unit tests') {
      steps {
        dir('backend') {
          sh 'npm run test:cov -- --runInBand'
        }
        dir('frontend') {
          sh 'npm run typecheck'
          // The frontend currently has no unit-test script; --if-present keeps
          // the stage honest until tests are added.
          sh 'npm run test --if-present'
        }
      }
    }

    stage('SonarQube') {
      when { expression { params.ENABLE_SONAR } }
      steps {
        withSonarQubeEnv('sonar') {
          sh '''
            command -v sonar-scanner >/dev/null || {
              echo "sonar-scanner no esta instalado en el agente linux-docker"
              exit 1
            }
            sonar-scanner -Dsonar.projectVersion="${BUILD_NUMBER}"
          '''
        }
      }
    }

    stage('npm audit') {
      steps {
        sh '''
          mkdir -p "$WORKSPACE/reports/security"
          (cd backend && npm audit --omit=dev --json > "$WORKSPACE/reports/security/npm-audit-backend.json" || true)
          (cd frontend && npm audit --omit=dev --json > "$WORKSPACE/reports/security/npm-audit-frontend.json" || true)
          # Critical findings block the pipeline. High/moderate findings remain
          # visible in the JSON evidence and in DEVOPS-PROGRESS.md.
          (cd backend && npm audit --omit=dev --audit-level=critical)
          (cd frontend && npm audit --omit=dev --audit-level=critical)
        '''
      }
    }

    stage('OWASP Dependency-Check') {
      when { expression { params.ENABLE_DEPENDENCY_CHECK } }
      steps {
        withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')]) {
          sh '''
            mkdir -p "$WORKSPACE/reports/security/dependency-check"
            docker run --rm \
              -v "$WORKSPACE:/src:ro" \
              -v "$WORKSPACE/reports/security/dependency-check:/report" \
              owasp/dependency-check:latest \
              --project SecureBank \
              --scan /src/backend \
              --scan /src/frontend \
              --format HTML --format JSON \
              --out /report \
              --nvdApiKey "$NVD_API_KEY" \
              --failOnCVSS 7
          '''
        }
      }
    }

    stage('Fortify') {
      when { expression { params.ENABLE_FORTIFY } }
      steps {
        sh '''
          command -v sourceanalyzer >/dev/null || {
            echo "Fortify SCA no esta instalado o no esta en PATH"
            exit 1
          }
          bash ci/fortify-scan.sh
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          # Compose interpolates the whole file even for `build`. These are
          # build-time placeholders only: no service is started and no real
          # credential is used or stored.
          export POSTGRES_DB=securebank
          export POSTGRES_USER=securebank
          export POSTGRES_PASSWORD=build-only-not-a-secret
          export RABBITMQ_USER=securebank
          export RABBITMQ_PASSWORD=build-only-not-a-secret
          export JWT_SECRET=build-only-not-a-secret
          docker compose --profile app --profile tools build backend frontend migrate
        '''
      }
    }

    stage('Deploy QA') {
      when { expression { params.DEPLOY_QA } }
      steps {
        input message: 'Se creara/actualizara el entorno QA. ¿Autorizar despliegue?', ok: 'Desplegar QA'
        withCredentials([
          file(credentialsId: 'ansible-vault-password', variable: 'ANSIBLE_VAULT_PASSWORD_FILE'),
          file(credentialsId: 'securebank-qa-vars', variable: 'SECUREBANK_QA_VARS')
        ]) {
          sshagent(credentials: ['securebank-qa-ssh']) {
            sh '''
              : "${QA_SSH_HOST:?Configure el parametro QA_SSH_HOST}"
              : "${QA_SSH_USER:?Configure el parametro QA_SSH_USER}"
              : "${SECUREBANK_QA_VARS:?Configure la credencial securebank-qa-vars}"

              ssh -o StrictHostKeyChecking=accept-new "$QA_SSH_USER@$QA_SSH_HOST" \
                "sudo mkdir -p /opt/securebank/app && sudo chown $QA_SSH_USER:$QA_SSH_USER /opt/securebank/app"
              tar --exclude='./.git' --exclude='./.env' --exclude='./node_modules' \
                --exclude='./backend/node_modules' --exclude='./frontend/node_modules' \
                --exclude='./mobile' --exclude='./tests' --exclude='./reports' \
                --exclude='./.terraform' --exclude='./infrastructure' --exclude='./docs' \
                -czf - . | ssh -o StrictHostKeyChecking=accept-new "$QA_SSH_USER@$QA_SSH_HOST" \
                "tar -xzf - -C /opt/securebank/app"

              INVENTORY_DIR="$PWD/ansible/inventory"
              mkdir -p "$INVENTORY_DIR/group_vars"
              trap 'rm -f "$INVENTORY_DIR/hosts.yml" "$INVENTORY_DIR/group_vars/all.yml"' EXIT
              cat > "$INVENTORY_DIR/hosts.yml" <<EOF
all:
  children:
    securebank:
      hosts:
        securebank-qa:
          ansible_host: ${QA_SSH_HOST}
          ansible_user: ${QA_SSH_USER}
          ansible_ssh_common_args: '-o StrictHostKeyChecking=accept-new'
EOF

              # The credential is a vault-encrypted copy of group_vars/all.yml.
              # Ansible loads it because it sits next to the inventory file.
              cp "$SECUREBANK_QA_VARS" "$INVENTORY_DIR/group_vars/all.yml"
              chmod 600 "$INVENTORY_DIR/group_vars/all.yml"

              cd ansible
              ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml \
                --vault-password-file "$ANSIBLE_VAULT_PASSWORD_FILE"
              ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
                --vault-password-file "$ANSIBLE_VAULT_PASSWORD_FILE"
            '''
          }
        }
      }
    }

    stage('API tests') {
      when { expression { params.DEPLOY_QA } }
      steps {
        sh '''
          : "${QA_BASE_URL:?Configure el parametro QA_BASE_URL}"
          API_BASE_URL="$QA_BASE_URL" node tests/api/smoke.mjs
        '''
      }
    }

    stage('Cypress E2E') {
      when { expression { params.DEPLOY_QA && params.ENABLE_CYPRESS } }
      steps {
        sh '''
          : "${QA_BASE_URL:?Configure el parametro QA_BASE_URL}"
          mkdir -p "$WORKSPACE/reports/cypress"
          docker run --rm \
            -v "$WORKSPACE:/work" -w /work \
            -e CYPRESS_BASE_URL="$QA_BASE_URL" \
            -e CYPRESS_video=false \
            cypress/included:latest \
            --config-file tests/cypress/cypress.config.ts
        '''
      }
    }

    stage('Maestro E2E') {
      when { expression { params.ENABLE_MAESTRO } }
      steps {
        sh '''
          command -v maestro >/dev/null || {
            echo "Maestro no esta instalado o no hay emulador/dispositivo disponible"
            exit 1
          }
          maestro test tests/maestro
        '''
      }
    }

    stage('ZAP DAST') {
      when { expression { params.DEPLOY_QA && params.ENABLE_DAST } }
      steps {
        sh '''
          : "${QA_BASE_URL:?Configure el parametro QA_BASE_URL}"
          mkdir -p "$WORKSPACE/reports/security"
          docker run --rm \
            -v "$WORKSPACE/reports/security:/zap/wrk:rw" \
            ghcr.io/zaproxy/zap-stable:latest \
            zap-baseline.py -t "$QA_BASE_URL" \
              -r zap-report.html -J zap-report.json
        '''
      }
    }

    stage('Performance') {
      when { expression { params.DEPLOY_QA && params.ENABLE_PERFORMANCE } }
      steps {
        sh '''
          : "${QA_BASE_URL:?Configure el parametro QA_BASE_URL}"
          mkdir -p "$WORKSPACE/reports/performance"
          docker run --rm \
            -v "$WORKSPACE/tests/performance:/scripts:ro" \
            -e BASE_URL="$QA_BASE_URL" \
            grafana/k6:latest run /scripts/smoke.js
        '''
      }
    }

    stage('Quality Gate') {
      when { expression { params.ENABLE_SONAR } }
      steps {
        withSonarQubeEnv('sonar') {
          timeout(time: 10, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
          }
        }
      }
    }

    stage('Approval') {
      when { expression { params.DEPLOY_FINAL } }
      steps {
        input message: 'Quality Gate y pruebas completadas. ¿Autorizar despliegue final?', ok: 'Desplegar final'
      }
    }

    stage('Deploy final') {
      when { expression { params.DEPLOY_FINAL } }
      steps {
        withCredentials([
          file(credentialsId: 'ansible-vault-password-final', variable: 'ANSIBLE_VAULT_PASSWORD_FILE'),
          file(credentialsId: 'securebank-final-vars', variable: 'SECUREBANK_FINAL_VARS')
        ]) {
          sshagent(credentials: ['securebank-final-ssh']) {
            sh '''
              : "${FINAL_SSH_HOST:?Configure el parametro FINAL_SSH_HOST}"
              : "${FINAL_SSH_USER:?Configure el parametro FINAL_SSH_USER}"
              : "${FINAL_BASE_URL:?Configure el parametro FINAL_BASE_URL}"
              : "${SECUREBANK_FINAL_VARS:?Configure la credencial securebank-final-vars}"

              ssh -o StrictHostKeyChecking=accept-new "$FINAL_SSH_USER@$FINAL_SSH_HOST" \
                "sudo mkdir -p /opt/securebank/app && sudo chown $FINAL_SSH_USER:$FINAL_SSH_USER /opt/securebank/app"
              tar --exclude='./.git' --exclude='./.env' --exclude='./node_modules' \
                --exclude='./backend/node_modules' --exclude='./frontend/node_modules' \
                --exclude='./mobile' --exclude='./tests' --exclude='./reports' \
                --exclude='./.terraform' --exclude='./infrastructure' --exclude='./docs' \
                -czf - . | ssh -o StrictHostKeyChecking=accept-new "$FINAL_SSH_USER@$FINAL_SSH_HOST" \
                "tar -xzf - -C /opt/securebank/app"

              INVENTORY_DIR="$PWD/ansible/inventory"
              mkdir -p "$INVENTORY_DIR/group_vars"
              trap 'rm -f "$INVENTORY_DIR/hosts.yml" "$INVENTORY_DIR/group_vars/all.yml"' EXIT
              cat > "$INVENTORY_DIR/hosts.yml" <<EOF
all:
  children:
    securebank:
      hosts:
        securebank-final:
          ansible_host: ${FINAL_SSH_HOST}
          ansible_user: ${FINAL_SSH_USER}
          ansible_ssh_common_args: '-o StrictHostKeyChecking=accept-new'
EOF

              cp "$SECUREBANK_FINAL_VARS" "$INVENTORY_DIR/group_vars/all.yml"
              chmod 600 "$INVENTORY_DIR/group_vars/all.yml"

              cd ansible
              ansible-playbook -i inventory/hosts.yml playbooks/bootstrap.yml \
                --vault-password-file "$ANSIBLE_VAULT_PASSWORD_FILE"
              ansible-playbook -i inventory/hosts.yml playbooks/deploy.yml \
                -e securebank_environment=prod \
                --vault-password-file "$ANSIBLE_VAULT_PASSWORD_FILE"

              API_BASE_URL="$FINAL_BASE_URL" node ../tests/api/smoke.mjs
            '''
          }
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/devops/**,reports/security/**,reports/cypress/**,backend/coverage/**', allowEmptyArchive: true, fingerprint: true
    }
  }
}
