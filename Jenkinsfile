pipeline {
    agent { label 'debian-builder' }
    options {
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        skipDefaultCheckout(true)
    }
    triggers { githubPush() }
    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                script { env.RELEASE_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim() }
                sh 'test "$(git ls-remote https://github.com/JackHoffsten/OurMemories.git refs/heads/main | cut -f1)" = "$RELEASE_SHA"'
            }
        }
        stage('Backend') {
            steps { dir('backend') { sh 'chmod +x mvnw && ./mvnw --batch-mode --no-transfer-progress verify' } }
            post { always { junit allowEmptyResults: true, testResults: 'backend/target/surefire-reports/*.xml' } }
        }
        stage('Frontend') {
            steps { dir('frontend') { sh 'npm ci && npm run format:check && npm run lint && npm test && npm run build' } }
        }
        stage('Build images and deploy') {
            steps {
                sh 'sudo -n /usr/local/sbin/ourmemories-deploy "$RELEASE_SHA"'
                script { currentBuild.description = "Deployed ${env.RELEASE_SHA}" }
            }
        }
    }
    post { always { deleteDir() } }
}
