param location string = resourceGroup().location
param resourceBaseName string
param registryName string
param containerEnvironmentName string
param pullIdentityName string
param sqlServerName string
param databaseName string = 'GestorInventarioDB'
param sqlAdministratorLogin string = 'agavaladmin'

@secure()
param sqlAdministratorPassword string

param backendImage string
param frontendImage string
param authenticationIssuer string = 'Agaval.Inventory.Api'
param authenticationAudience string = 'Agaval.Inventory.Frontend'
param authenticationUsername string = 'admin'
param authenticationRole string = 'InventoryManager'

@secure()
param authenticationPassword string

@secure()
param jwtSigningKey string

resource containerEnvironment 'Microsoft.App/managedEnvironments@2025-01-01' existing = {
  name: containerEnvironmentName
}

resource registry 'Microsoft.ContainerRegistry/registries@2025-04-01' existing = {
  name: registryName
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: pullIdentityName
}

resource sqlServer 'Microsoft.Sql/servers@2025-01-01' existing = {
  name: sqlServerName
}

var backendName = '${resourceBaseName}-api'
var frontendName = '${resourceBaseName}-web'
var frontendOrigin = 'https://${frontendName}.${containerEnvironment.properties.defaultDomain}'
var databaseConnection = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Initial Catalog=${databaseName};Persist Security Info=False;User ID=${sqlAdministratorLogin};Password=${sqlAdministratorPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'

resource backend 'Microsoft.App/containerApps@2025-01-01' = {
  name: backendName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        allowInsecure: false
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
      secrets: [
        { name: 'database-connection', value: databaseConnection }
        { name: 'jwt-signing-key', value: jwtSigningKey }
        { name: 'auth-password', value: authenticationPassword }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: backendImage
          env: [
            { name: 'ASPNETCORE_ENVIRONMENT', value: 'Production' }
            { name: 'ASPNETCORE_URLS', value: 'http://+:8080' }
            { name: 'ConnectionStrings__Database', secretRef: 'database-connection' }
            { name: 'Database__ApplyMigrationsOnStartup', value: 'true' }
            { name: 'Cors__AllowedOrigins__0', value: frontendOrigin }
            { name: 'Authentication__Issuer', value: authenticationIssuer }
            { name: 'Authentication__Audience', value: authenticationAudience }
            { name: 'Authentication__SigningKey', secretRef: 'jwt-signing-key' }
            { name: 'Authentication__Username', value: authenticationUsername }
            { name: 'Authentication__Password', secretRef: 'auth-password' }
            { name: 'Authentication__Role', value: authenticationRole }
            { name: 'Authentication__TokenLifetimeMinutes', value: '120' }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/health', port: 8080, scheme: 'HTTP' }
              initialDelaySeconds: 20
              periodSeconds: 20
            }
            {
              type: 'Readiness'
              httpGet: { path: '/health', port: 8080, scheme: 'HTTP' }
              initialDelaySeconds: 10
              periodSeconds: 10
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

resource frontend 'Microsoft.App/containerApps@2025-01-01' = {
  name: frontendName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: frontendImage
          env: [
            { name: 'BACKEND_UPSTREAM', value: 'http://${backend.name}' }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/', port: 8080, scheme: 'HTTP' }
              initialDelaySeconds: 5
              periodSeconds: 20
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

output frontendUrl string = 'https://${frontend.properties.configuration.ingress.fqdn}'
output backendInternalName string = backend.name
