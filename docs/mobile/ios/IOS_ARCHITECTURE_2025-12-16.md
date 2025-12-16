# OpenMeet iOS Native Application - Architecture Documentation

**Version**: 1.0.0
**Date**: 2025-12-16
**Status**: Implementation Ready
**Platform**: iOS 17.0+
**Language**: Swift 5.9+

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Layer Definitions](#layer-definitions)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Security Architecture](#security-architecture)
7. [Networking Layer](#networking-layer)
8. [Persistence Layer](#persistence-layer)
9. [Dependency Injection](#dependency-injection)
10. [Testing Strategy](#testing-strategy)
11. [Observability](#observability)
12. [CLAUDE.md Compliance](#claudemd-compliance)

---

## Executive Summary

This document defines the complete architecture for the OpenMeet iOS native application. The architecture follows **MVVM + Clean Architecture** principles with protocol-oriented design, ensuring:

- **Testability**: 80%+ unit test coverage through dependency injection
- **Maintainability**: Clear separation of concerns across layers
- **Scalability**: Modular feature structure supporting team parallelization
- **Security**: iOS Keychain for secrets, certificate pinning, biometric authentication
- **Offline Support**: Core Data persistence with sync engine

### Current State
- Basic Xcode scaffold with SwiftUI Hello World view
- 132 lines of code total
- No architecture implemented

### Target State
- Full-featured iOS application with feature parity to web platform
- MVVM + Clean Architecture with 4 distinct layers
- 80%+ test coverage
- Production-ready with enterprise features

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │   SwiftUI Views  │  │   ViewModels     │  │   Coordinators   │           │
│  │   - Declarative  │──│   - @Observable  │──│   - Navigation   │           │
│  │   - Composable   │  │   - State mgmt   │  │   - Deep linking │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                   │                                          │
├───────────────────────────────────┼──────────────────────────────────────────┤
│                            DOMAIN LAYER                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │    Use Cases     │  │    Entities      │  │   Repository     │           │
│  │   - Business     │──│   - Pure models  │──│   Protocols      │           │
│  │     logic        │  │   - Value types  │  │   - Abstractions │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                   │                                          │
├───────────────────────────────────┼──────────────────────────────────────────┤
│                             DATA LAYER                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │   APIClient      │  │  Repositories    │  │   Core Data      │           │
│  │   - URLSession   │──│  - Impl of       │──│   - Offline      │           │
│  │   - Interceptors │  │    protocols     │  │   - Sync engine  │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                   │                                          │
├───────────────────────────────────┼──────────────────────────────────────────┤
│                        INFRASTRUCTURE LAYER                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │   Keychain       │  │   Biometrics     │  │   Logging        │           │
│  │   - Secure store │──│   - Face ID      │──│   - os_log       │           │
│  │   - KeychainAccess│ │   - Touch ID     │  │   - Sentry       │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Dependency Rule**: Dependencies point inward only. Domain layer has no external dependencies.
2. **Protocol-Oriented**: All cross-layer communication through protocols.
3. **Unidirectional Data Flow**: View → ViewModel → UseCase → Repository → API/DB
4. **Single Responsibility**: Each component has one reason to change.
5. **Testability First**: All dependencies injectable, no singletons except DI container.

---

## Layer Definitions

### Presentation Layer

**Responsibility**: UI rendering, user input handling, navigation

| Component | Purpose | Example |
|-----------|---------|---------|
| **Views** | SwiftUI declarative UI components | `MeetingsListView`, `LoginView` |
| **ViewModels** | State management, UI logic | `MeetingsListViewModel` |
| **Coordinators** | Navigation flow, deep linking | `AuthCoordinator`, `MainCoordinator` |

```swift
// ✅ REQUIRED: ViewModel pattern with @Observable
@Observable
final class MeetingsListViewModel {
    private(set) var meetings: [Meeting] = []
    private(set) var isLoading = false
    private(set) var error: AppError?

    private let getMeetingsUseCase: GetMeetingsUseCaseProtocol

    init(getMeetingsUseCase: GetMeetingsUseCaseProtocol) {
        self.getMeetingsUseCase = getMeetingsUseCase
    }

    func loadMeetings() async {
        isLoading = true
        defer { isLoading = false }

        do {
            meetings = try await getMeetingsUseCase.execute()
        } catch {
            self.error = AppError(error)
        }
    }
}
```

### Domain Layer

**Responsibility**: Business logic, domain entities, repository contracts

| Component | Purpose | Example |
|-----------|---------|---------|
| **Entities** | Pure domain models, value types | `Meeting`, `User`, `Transcript` |
| **Use Cases** | Business logic orchestration | `GetMeetingsUseCase`, `LoginUseCase` |
| **Repository Protocols** | Data access abstractions | `MeetingsRepositoryProtocol` |

```swift
// ✅ REQUIRED: Pure domain entity (no framework dependencies)
struct Meeting: Identifiable, Equatable, Sendable {
    let id: UUID
    let title: String
    let date: Date
    let duration: TimeInterval
    let participants: [Participant]
    let transcriptStatus: TranscriptStatus
    let audioURL: URL?
    let videoURL: URL?
}

// ✅ REQUIRED: Use case protocol
protocol GetMeetingsUseCaseProtocol {
    func execute(filter: MeetingFilter?) async throws -> [Meeting]
}
```

### Data Layer

**Responsibility**: Data access implementation, API calls, persistence

| Component | Purpose | Example |
|-----------|---------|---------|
| **APIClient** | Network requests, response handling | `APIClient` |
| **Repositories** | Implementation of domain protocols | `MeetingsRepository` |
| **DTOs** | Data transfer objects for API | `MeetingDTO`, `UserDTO` |
| **Core Data** | Offline persistence | `CoreDataStack`, `MeetingEntity` |

```swift
// ✅ REQUIRED: Repository implementation
final class MeetingsRepository: MeetingsRepositoryProtocol {
    private let apiClient: APIClientProtocol
    private let coreDataStack: CoreDataStackProtocol
    private let syncEngine: SyncEngineProtocol

    init(
        apiClient: APIClientProtocol,
        coreDataStack: CoreDataStackProtocol,
        syncEngine: SyncEngineProtocol
    ) {
        self.apiClient = apiClient
        self.coreDataStack = coreDataStack
        self.syncEngine = syncEngine
    }

    func getMeetings(filter: MeetingFilter?) async throws -> [Meeting] {
        // Try network first, fallback to cache
        do {
            let dtos = try await apiClient.request(MeetingsEndpoint.list(filter: filter))
            let meetings = dtos.map { $0.toDomain() }
            await coreDataStack.save(meetings)
            return meetings
        } catch {
            // Fallback to offline cache
            return try await coreDataStack.fetchMeetings(filter: filter)
        }
    }
}
```

### Infrastructure Layer

**Responsibility**: System services, security, logging

| Component | Purpose | Example |
|-----------|---------|---------|
| **KeychainManager** | Secure credential storage | Token storage, biometric keys |
| **BiometricAuth** | Face ID/Touch ID authentication | `BiometricAuthenticator` |
| **Logger** | Structured logging with os_log | `AppLogger` |
| **Analytics** | Event tracking | `AnalyticsService` |

---

## Project Structure

```
OpenMeet/
├── App/
│   ├── OpenMeetApp.swift                 # App entry point
│   ├── AppDelegate.swift                 # UIKit app delegate adapter
│   └── SceneDelegate.swift               # Scene configuration
│
├── Core/
│   ├── DI/
│   │   ├── Container.swift               # Factory DI container
│   │   └── Container+Registrations.swift # Dependency registrations
│   │
│   ├── Security/
│   │   ├── KeychainManager.swift         # Keychain wrapper
│   │   ├── BiometricAuthenticator.swift  # Face ID/Touch ID
│   │   ├── CertificatePinner.swift       # SSL pinning
│   │   └── JailbreakDetector.swift       # Security checks
│   │
│   ├── Logging/
│   │   ├── AppLogger.swift               # os_log wrapper
│   │   └── CrashReporter.swift           # Sentry integration
│   │
│   ├── Extensions/
│   │   ├── Date+Extensions.swift
│   │   ├── String+Extensions.swift
│   │   └── URLRequest+Extensions.swift
│   │
│   └── Utilities/
│       ├── Constants.swift               # App-wide constants
│       └── Environment.swift             # Build configuration
│
├── Domain/
│   ├── Entities/
│   │   ├── User.swift
│   │   ├── Meeting.swift
│   │   ├── Transcript.swift
│   │   ├── ActionItem.swift
│   │   ├── Deal.swift
│   │   └── Organization.swift
│   │
│   ├── UseCases/
│   │   ├── Auth/
│   │   │   ├── LoginUseCase.swift
│   │   │   ├── LogoutUseCase.swift
│   │   │   └── RefreshTokenUseCase.swift
│   │   │
│   │   ├── Meetings/
│   │   │   ├── GetMeetingsUseCase.swift
│   │   │   ├── GetMeetingDetailUseCase.swift
│   │   │   └── SearchMeetingsUseCase.swift
│   │   │
│   │   └── AI/
│   │       ├── AskAIUseCase.swift
│   │       ├── GetSummaryUseCase.swift
│   │       └── GetActionItemsUseCase.swift
│   │
│   └── Repositories/
│       ├── AuthRepositoryProtocol.swift
│       ├── MeetingsRepositoryProtocol.swift
│       ├── TranscriptRepositoryProtocol.swift
│       └── AIRepositoryProtocol.swift
│
├── Data/
│   ├── Network/
│   │   ├── APIClient.swift               # URLSession wrapper
│   │   ├── APIEndpoint.swift             # Endpoint protocol
│   │   ├── AuthInterceptor.swift         # Token injection/refresh
│   │   ├── NetworkMonitor.swift          # Connectivity status
│   │   └── Endpoints/
│   │       ├── AuthEndpoints.swift
│   │       ├── MeetingsEndpoints.swift
│   │       └── AIEndpoints.swift
│   │
│   ├── DTOs/
│   │   ├── UserDTO.swift
│   │   ├── MeetingDTO.swift
│   │   ├── TranscriptDTO.swift
│   │   └── Mappers/
│   │       └── DTOMappers.swift
│   │
│   ├── Repositories/
│   │   ├── AuthRepository.swift
│   │   ├── MeetingsRepository.swift
│   │   └── AIRepository.swift
│   │
│   └── Persistence/
│       ├── CoreDataStack.swift           # Core Data setup
│       ├── OpenMeet.xcdatamodeld         # Core Data model
│       ├── Entities/
│       │   ├── MeetingEntity.swift
│       │   └── UserEntity.swift
│       └── SyncEngine/
│           ├── SyncEngine.swift          # Offline sync
│           ├── SyncOperation.swift
│           └── ConflictResolver.swift
│
├── Features/
│   ├── Auth/
│   │   ├── Views/
│   │   │   ├── LoginView.swift
│   │   │   ├── RegisterView.swift
│   │   │   ├── BiometricPromptView.swift
│   │   │   └── MFAView.swift
│   │   ├── ViewModels/
│   │   │   ├── LoginViewModel.swift
│   │   │   └── RegisterViewModel.swift
│   │   └── Coordinator/
│   │       └── AuthCoordinator.swift
│   │
│   ├── Meetings/
│   │   ├── Views/
│   │   │   ├── MeetingsListView.swift
│   │   │   ├── MeetingDetailView.swift
│   │   │   ├── MeetingRowView.swift
│   │   │   └── MeetingFilterView.swift
│   │   ├── ViewModels/
│   │   │   ├── MeetingsListViewModel.swift
│   │   │   └── MeetingDetailViewModel.swift
│   │   └── Coordinator/
│   │       └── MeetingsCoordinator.swift
│   │
│   ├── Player/
│   │   ├── Views/
│   │   │   ├── AudioPlayerView.swift
│   │   │   ├── VideoPlayerView.swift
│   │   │   ├── TranscriptView.swift
│   │   │   └── PlayerControlsView.swift
│   │   ├── ViewModels/
│   │   │   └── PlayerViewModel.swift
│   │   └── Services/
│   │       ├── AudioPlayerService.swift
│   │       └── TranscriptSyncService.swift
│   │
│   ├── AI/
│   │   ├── Views/
│   │   │   ├── AskAIView.swift
│   │   │   ├── SummaryView.swift
│   │   │   ├── ActionItemsView.swift
│   │   │   └── SentimentView.swift
│   │   └── ViewModels/
│   │       ├── AskAIViewModel.swift
│   │       └── SummaryViewModel.swift
│   │
│   ├── Revenue/
│   │   ├── Views/
│   │   │   ├── DealsListView.swift
│   │   │   ├── PipelineView.swift
│   │   │   └── CoachingView.swift
│   │   └── ViewModels/
│   │       └── RevenueViewModel.swift
│   │
│   └── Settings/
│       ├── Views/
│       │   ├── SettingsView.swift
│       │   ├── ProfileView.swift
│       │   └── SecuritySettingsView.swift
│       └── ViewModels/
│           └── SettingsViewModel.swift
│
├── Navigation/
│   ├── AppCoordinator.swift              # Root coordinator
│   ├── TabCoordinator.swift              # Tab bar management
│   └── DeepLinkHandler.swift             # URL scheme handling
│
├── Resources/
│   ├── Assets.xcassets/
│   ├── Localizable.strings
│   └── Info.plist
│
└── Tests/
    ├── UnitTests/
    │   ├── Domain/
    │   │   └── UseCases/
    │   ├── Data/
    │   │   └── Repositories/
    │   └── Core/
    │       └── Security/
    │
    ├── IntegrationTests/
    │   └── Network/
    │
    └── UITests/
        └── Features/
```

---

## Core Components

### APIClient

```swift
// ✅ REQUIRED: Production-grade API client
protocol APIClientProtocol {
    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T
    func upload(data: Data, to endpoint: APIEndpoint, progress: @escaping (Double) -> Void) async throws
    func download(from endpoint: APIEndpoint, progress: @escaping (Double) -> Void) async throws -> URL
}

final class APIClient: APIClientProtocol {
    private let session: URLSession
    private let authInterceptor: AuthInterceptorProtocol
    private let certificatePinner: CertificatePinnerProtocol
    private let retryPolicy: RetryPolicy
    private let logger: AppLoggerProtocol

    // ✅ REQUIRED: Exponential backoff retry
    struct RetryPolicy {
        let maxAttempts: Int = 3
        let baseDelay: TimeInterval = 1.0
        let maxDelay: TimeInterval = 30.0
        let jitter: Double = 0.1

        func delay(for attempt: Int) -> TimeInterval {
            let exponentialDelay = baseDelay * pow(2.0, Double(attempt - 1))
            let clampedDelay = min(exponentialDelay, maxDelay)
            let jitterRange = clampedDelay * jitter
            return clampedDelay + Double.random(in: -jitterRange...jitterRange)
        }
    }

    func request<T: Decodable>(_ endpoint: APIEndpoint) async throws -> T {
        var lastError: Error?

        for attempt in 1...retryPolicy.maxAttempts {
            do {
                var request = try endpoint.asURLRequest()
                request = try await authInterceptor.intercept(request)

                let (data, response) = try await session.data(for: request)

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw APIError.invalidResponse
                }

                // ✅ REQUIRED: Handle 401 with token refresh
                if httpResponse.statusCode == 401 {
                    try await authInterceptor.refreshToken()
                    continue // Retry with new token
                }

                guard 200...299 ~= httpResponse.statusCode else {
                    throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
                }

                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                return try decoder.decode(T.self, from: data)

            } catch {
                lastError = error

                // Don't retry non-retryable errors
                if case APIError.unauthorized = error { throw error }
                if case APIError.forbidden = error { throw error }
                if case APIError.notFound = error { throw error }

                if attempt < retryPolicy.maxAttempts {
                    let delay = retryPolicy.delay(for: attempt)
                    logger.debug("Retrying request in \(delay)s (attempt \(attempt)/\(retryPolicy.maxAttempts))")
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }

        throw lastError ?? APIError.unknown
    }
}
```

### AuthInterceptor

```swift
// ✅ REQUIRED: Token management with refresh queue
actor AuthInterceptor: AuthInterceptorProtocol {
    private let keychainManager: KeychainManagerProtocol
    private let tokenRefreshService: TokenRefreshServiceProtocol
    private var isRefreshing = false
    private var refreshContinuations: [CheckedContinuation<Void, Error>] = []

    func intercept(_ request: URLRequest) async throws -> URLRequest {
        var request = request

        guard let accessToken = try? keychainManager.getString(.accessToken) else {
            throw APIError.unauthorized
        }

        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        return request
    }

    // ✅ REQUIRED: Coalesced token refresh (only one refresh at a time)
    func refreshToken() async throws {
        if isRefreshing {
            // Wait for ongoing refresh
            try await withCheckedThrowingContinuation { continuation in
                refreshContinuations.append(continuation)
            }
            return
        }

        isRefreshing = true
        defer { isRefreshing = false }

        do {
            guard let refreshToken = try? keychainManager.getString(.refreshToken) else {
                throw APIError.unauthorized
            }

            let tokens = try await tokenRefreshService.refresh(token: refreshToken)
            try keychainManager.set(tokens.accessToken, for: .accessToken)
            try keychainManager.set(tokens.refreshToken, for: .refreshToken)

            // Resume all waiting requests
            for continuation in refreshContinuations {
                continuation.resume()
            }
            refreshContinuations.removeAll()

        } catch {
            // Fail all waiting requests
            for continuation in refreshContinuations {
                continuation.resume(throwing: error)
            }
            refreshContinuations.removeAll()
            throw error
        }
    }
}
```

---

## Security Architecture

### Keychain Manager

```swift
// ✅ REQUIRED: Secure storage using iOS Keychain
import KeychainAccess

protocol KeychainManagerProtocol {
    func set(_ value: String, for key: KeychainKey) throws
    func getString(_ key: KeychainKey) throws -> String?
    func delete(_ key: KeychainKey) throws
    func deleteAll() throws
}

enum KeychainKey: String {
    case accessToken = "com.openmeet.accessToken"
    case refreshToken = "com.openmeet.refreshToken"
    case biometricKey = "com.openmeet.biometricKey"
    case userId = "com.openmeet.userId"
}

final class KeychainManager: KeychainManagerProtocol {
    private let keychain: Keychain

    init(serviceName: String = Bundle.main.bundleIdentifier ?? "com.openmeet") {
        self.keychain = Keychain(service: serviceName)
            .accessibility(.whenUnlockedThisDeviceOnly) // ✅ REQUIRED: Device-bound
            .synchronizable(false) // ✅ REQUIRED: No iCloud sync for secrets
    }

    func set(_ value: String, for key: KeychainKey) throws {
        try keychain.set(value, key: key.rawValue)
    }

    func getString(_ key: KeychainKey) throws -> String? {
        try keychain.get(key.rawValue)
    }

    func delete(_ key: KeychainKey) throws {
        try keychain.remove(key.rawValue)
    }

    func deleteAll() throws {
        try keychain.removeAll()
    }
}
```

### Biometric Authentication

```swift
// ✅ REQUIRED: Face ID/Touch ID implementation
import LocalAuthentication

protocol BiometricAuthenticatorProtocol {
    var biometricType: BiometricType { get }
    var isAvailable: Bool { get }
    func authenticate(reason: String) async throws -> Bool
}

enum BiometricType {
    case none
    case touchID
    case faceID
}

final class BiometricAuthenticator: BiometricAuthenticatorProtocol {
    private let context = LAContext()

    var biometricType: BiometricType {
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .touchID: return .touchID
        case .faceID: return .faceID
        default: return .none
        }
    }

    var isAvailable: Bool {
        biometricType != .none
    }

    func authenticate(reason: String) async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            ) { success, error in
                if let error = error {
                    continuation.resume(throwing: BiometricError(error))
                } else {
                    continuation.resume(returning: success)
                }
            }
        }
    }
}
```

### Certificate Pinning

```swift
// ✅ REQUIRED: SSL certificate pinning
final class CertificatePinner: NSObject, URLSessionDelegate {
    private let pinnedCertificates: [SecCertificate]
    private let allowedDomains: Set<String>

    init(certificateNames: [String], allowedDomains: [String]) {
        self.allowedDomains = Set(allowedDomains)
        self.pinnedCertificates = certificateNames.compactMap { name in
            guard let path = Bundle.main.path(forResource: name, ofType: "cer"),
                  let data = try? Data(contentsOf: URL(fileURLWithPath: path)),
                  let cert = SecCertificateCreateWithData(nil, data as CFData) else {
                return nil
            }
            return cert
        }
        super.init()
    }

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              allowedDomains.contains(challenge.protectionSpace.host),
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        // Validate server certificate against pinned certificates
        var isValid = false
        if let serverCertificates = SecTrustCopyCertificateChain(serverTrust) as? [SecCertificate] {
            for serverCert in serverCertificates {
                for pinnedCert in pinnedCertificates {
                    if SecCertificateCopyData(serverCert) == SecCertificateCopyData(pinnedCert) {
                        isValid = true
                        break
                    }
                }
            }
        }

        if isValid {
            completionHandler(.useCredential, URLCredential(trust: serverTrust))
        } else {
            completionHandler(.cancelAuthenticationChallenge, nil)
        }
    }
}
```

---

## Persistence Layer

### Core Data Stack

```swift
// ✅ REQUIRED: Core Data setup for offline support
protocol CoreDataStackProtocol {
    var viewContext: NSManagedObjectContext { get }
    func save<T: DomainConvertible>(_ entities: [T]) async throws
    func fetch<T: DomainConvertible>(_ type: T.Type, predicate: NSPredicate?) async throws -> [T.DomainType]
    func delete<T: DomainConvertible>(_ type: T.Type, predicate: NSPredicate?) async throws
    func performBackgroundTask(_ block: @escaping (NSManagedObjectContext) -> Void)
}

final class CoreDataStack: CoreDataStackProtocol {
    static let shared = CoreDataStack()

    private let container: NSPersistentContainer

    var viewContext: NSManagedObjectContext {
        container.viewContext
    }

    private init() {
        container = NSPersistentContainer(name: "OpenMeet")

        // ✅ REQUIRED: Configure for performance
        let description = container.persistentStoreDescriptions.first
        description?.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
        description?.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)

        container.loadPersistentStores { description, error in
            if let error = error {
                fatalError("Core Data failed to load: \(error)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        container.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    func performBackgroundTask(_ block: @escaping (NSManagedObjectContext) -> Void) {
        container.performBackgroundTask(block)
    }
}
```

### Sync Engine

```swift
// ✅ REQUIRED: Offline sync with conflict resolution
protocol SyncEngineProtocol {
    func queueOperation(_ operation: SyncOperation) async
    func sync() async throws
    var pendingOperationsCount: Int { get }
}

enum SyncOperation: Codable {
    case create(entityType: String, data: Data, localId: UUID)
    case update(entityType: String, id: UUID, data: Data)
    case delete(entityType: String, id: UUID)
}

final class SyncEngine: SyncEngineProtocol {
    private let apiClient: APIClientProtocol
    private let coreDataStack: CoreDataStackProtocol
    private let networkMonitor: NetworkMonitorProtocol
    private let queue: OperationQueue
    private var pendingOperations: [SyncOperation] = []

    var pendingOperationsCount: Int {
        pendingOperations.count
    }

    init(
        apiClient: APIClientProtocol,
        coreDataStack: CoreDataStackProtocol,
        networkMonitor: NetworkMonitorProtocol
    ) {
        self.apiClient = apiClient
        self.coreDataStack = coreDataStack
        self.networkMonitor = networkMonitor
        self.queue = OperationQueue()
        queue.maxConcurrentOperationCount = 1

        // Load persisted pending operations
        loadPendingOperations()

        // Auto-sync when network becomes available
        Task {
            for await isConnected in networkMonitor.connectivityStream {
                if isConnected && !pendingOperations.isEmpty {
                    try? await sync()
                }
            }
        }
    }

    func queueOperation(_ operation: SyncOperation) async {
        pendingOperations.append(operation)
        persistPendingOperations()

        if networkMonitor.isConnected {
            try? await sync()
        }
    }

    func sync() async throws {
        guard networkMonitor.isConnected else { return }

        for operation in pendingOperations {
            do {
                try await executeOperation(operation)
                pendingOperations.removeAll { $0 == operation }
                persistPendingOperations()
            } catch {
                // Keep failed operations in queue for retry
                throw error
            }
        }
    }
}
```

---

## Dependency Injection

### Factory Container

```swift
// ✅ REQUIRED: Factory-based dependency injection
import Factory

extension Container {
    // MARK: - Infrastructure

    var keychainManager: Factory<KeychainManagerProtocol> {
        self { KeychainManager() }
            .singleton
    }

    var biometricAuthenticator: Factory<BiometricAuthenticatorProtocol> {
        self { BiometricAuthenticator() }
            .singleton
    }

    var logger: Factory<AppLoggerProtocol> {
        self { AppLogger() }
            .singleton
    }

    // MARK: - Network

    var apiClient: Factory<APIClientProtocol> {
        self { APIClient(
            authInterceptor: self.authInterceptor(),
            certificatePinner: self.certificatePinner(),
            logger: self.logger()
        ) }
        .singleton
    }

    var authInterceptor: Factory<AuthInterceptorProtocol> {
        self { AuthInterceptor(
            keychainManager: self.keychainManager(),
            tokenRefreshService: self.tokenRefreshService()
        ) }
    }

    // MARK: - Repositories

    var authRepository: Factory<AuthRepositoryProtocol> {
        self { AuthRepository(
            apiClient: self.apiClient(),
            keychainManager: self.keychainManager()
        ) }
    }

    var meetingsRepository: Factory<MeetingsRepositoryProtocol> {
        self { MeetingsRepository(
            apiClient: self.apiClient(),
            coreDataStack: self.coreDataStack(),
            syncEngine: self.syncEngine()
        ) }
    }

    // MARK: - Use Cases

    var loginUseCase: Factory<LoginUseCaseProtocol> {
        self { LoginUseCase(
            authRepository: self.authRepository(),
            biometricAuthenticator: self.biometricAuthenticator()
        ) }
    }

    var getMeetingsUseCase: Factory<GetMeetingsUseCaseProtocol> {
        self { GetMeetingsUseCase(
            meetingsRepository: self.meetingsRepository()
        ) }
    }

    // MARK: - ViewModels

    var loginViewModel: Factory<LoginViewModel> {
        self { LoginViewModel(
            loginUseCase: self.loginUseCase()
        ) }
    }

    var meetingsListViewModel: Factory<MeetingsListViewModel> {
        self { MeetingsListViewModel(
            getMeetingsUseCase: self.getMeetingsUseCase()
        ) }
    }
}
```

---

## Testing Strategy

### Unit Test Structure

```swift
// ✅ REQUIRED: Comprehensive unit testing
import XCTest
@testable import OpenMeet

final class LoginUseCaseTests: XCTestCase {
    private var sut: LoginUseCase!
    private var mockAuthRepository: MockAuthRepository!
    private var mockBiometricAuth: MockBiometricAuthenticator!

    override func setUp() {
        super.setUp()
        mockAuthRepository = MockAuthRepository()
        mockBiometricAuth = MockBiometricAuthenticator()
        sut = LoginUseCase(
            authRepository: mockAuthRepository,
            biometricAuthenticator: mockBiometricAuth
        )
    }

    override func tearDown() {
        sut = nil
        mockAuthRepository = nil
        mockBiometricAuth = nil
        super.tearDown()
    }

    func testLogin_withValidCredentials_returnsUser() async throws {
        // Arrange
        let expectedUser = User.mock()
        mockAuthRepository.loginResult = .success(expectedUser)

        // Act
        let result = try await sut.execute(email: "test@example.com", password: "password123")

        // Assert
        XCTAssertEqual(result.id, expectedUser.id)
        XCTAssertEqual(result.email, expectedUser.email)
        XCTAssertTrue(mockAuthRepository.loginCalled)
    }

    func testLogin_withInvalidCredentials_throwsError() async {
        // Arrange
        mockAuthRepository.loginResult = .failure(AuthError.invalidCredentials)

        // Act & Assert
        do {
            _ = try await sut.execute(email: "test@example.com", password: "wrong")
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertTrue(error is AuthError)
        }
    }
}
```

### Mock Objects

```swift
// ✅ REQUIRED: Mock objects for testing (tests only)
final class MockAuthRepository: AuthRepositoryProtocol {
    var loginResult: Result<User, Error> = .failure(AuthError.unknown)
    var loginCalled = false
    var loginEmail: String?
    var loginPassword: String?

    func login(email: String, password: String) async throws -> User {
        loginCalled = true
        loginEmail = email
        loginPassword = password
        return try loginResult.get()
    }
}
```

---

## Observability

### Structured Logging

```swift
// ✅ REQUIRED: Production logging with os_log
import os.log

protocol AppLoggerProtocol {
    func debug(_ message: String, file: String, function: String, line: Int)
    func info(_ message: String, file: String, function: String, line: Int)
    func warning(_ message: String, file: String, function: String, line: Int)
    func error(_ message: String, error: Error?, file: String, function: String, line: Int)
}

final class AppLogger: AppLoggerProtocol {
    private let logger: Logger

    init(subsystem: String = Bundle.main.bundleIdentifier ?? "com.openmeet",
         category: String = "general") {
        self.logger = Logger(subsystem: subsystem, category: category)
    }

    func debug(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        logger.debug("[\(file):\(line)] \(function) - \(message)")
    }

    func info(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        logger.info("[\(file):\(line)] \(function) - \(message)")
    }

    func warning(_ message: String, file: String = #file, function: String = #function, line: Int = #line) {
        logger.warning("[\(file):\(line)] \(function) - \(message)")
    }

    func error(_ message: String, error: Error? = nil, file: String = #file, function: String = #function, line: Int = #line) {
        let errorString = error.map { " | Error: \($0.localizedDescription)" } ?? ""
        logger.error("[\(file):\(line)] \(function) - \(message)\(errorString)")

        // ✅ REQUIRED: Report to Sentry for production
        #if !DEBUG
        if let error = error {
            SentrySDK.capture(error: error)
        }
        #endif
    }
}
```

---

## CLAUDE.md Compliance

### Zero-Tolerance Checklist

All implementations MUST pass these checks:

| Requirement | Implementation | Verification |
|-------------|---------------|--------------|
| No fake/mock implementations | Real API calls only | Integration tests |
| No hardcoded data | All from backend API | Code review |
| No UserDefaults for secrets | iOS Keychain only | Security audit |
| No console.log | os_log structured logging | Static analysis |
| Proper error handling | Retry + exponential backoff | Unit tests |
| Type safety | Full Swift type system | Compiler |
| Test coverage | 80%+ unit test coverage | CI/CD |

### Forbidden Patterns

```swift
// 🚫 FORBIDDEN: Hardcoded data
let meetings = [Meeting(id: "1", title: "Test Meeting")]

// 🚫 FORBIDDEN: UserDefaults for secrets
UserDefaults.standard.set(accessToken, forKey: "token")

// 🚫 FORBIDDEN: print() or NSLog
print("Debug: \(response)")

// 🚫 FORBIDDEN: Force unwrapping
let user = response.user!

// 🚫 FORBIDDEN: Empty catch blocks
catch { }

// 🚫 FORBIDDEN: Sync network calls
URLSession.shared.dataTask(with: request).resume() // No completion handler

// 🚫 FORBIDDEN: TODO comments
// TODO: implement this later
```

---

## References

- [Apple SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Factory Dependency Injection](https://github.com/hmlongco/Factory)
- [KeychainAccess](https://github.com/kishikawakatsumi/KeychainAccess)
- [CLAUDE.md Standards](../../../CLAUDE.md)
- [Backend API Routes](../../../apps/api/src/routes/)
- [Prisma Schema](../../../apps/api/prisma/schema.prisma)

---

*Document Version: 1.0.0 | Created: 2025-12-16 | Author: Claude Code*
