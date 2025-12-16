# OpenMeet iOS Native Application - Implementation Tasks for Agents

**Version**: 1.0.0
**Date**: 2025-12-16
**Status**: Agent Execution Ready
**Target Path**: `/mobile-apps/nebula-ai-ios-app/`

---

## Table of Contents

1. [Agent Assignment Matrix](#agent-assignment-matrix)
2. [Task Execution Order](#task-execution-order)
3. [Phase 1 Tasks: Core Foundation](#phase-1-tasks-core-foundation)
4. [Phase 2 Tasks: Meetings Core](#phase-2-tasks-meetings-core)
5. [Phase 3 Tasks: AI Features](#phase-3-tasks-ai-features)
6. [Phase 4 Tasks: Revenue Intelligence](#phase-4-tasks-revenue-intelligence)
7. [Verification Tasks](#verification-tasks)
8. [CLAUDE.md Enforcement Rules](#claudemd-enforcement-rules)

---

## Agent Assignment Matrix

| Agent Type | Responsibilities | Files to Create/Modify |
|------------|------------------|------------------------|
| **implementation-bot** | Core architecture, networking, features | All Swift source files |
| **code-reviewer** | Review generated code for quality | N/A (review only) |
| **test-writer** | Create unit tests, integration tests | All *Tests.swift files |
| **documentation-specialist** | Inline documentation, README | README.md, doc comments |
| **ai-guard-enforcer** | CLAUDE.md compliance validation | N/A (validation only) |

---

## Task Execution Order

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXECUTION ORDER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  STEP 1: Project Structure Setup                                            │
│  ├─ Create folder structure                                                 │
│  ├─ Configure Package.swift                                                 │
│  └─ Update Xcode project                                                    │
│                                                                              │
│  STEP 2: Infrastructure Layer                                               │
│  ├─ KeychainManager                                                         │
│  ├─ BiometricAuthenticator                                                  │
│  ├─ AppLogger                                                               │
│  └─ DI Container                                                            │
│                                                                              │
│  STEP 3: Networking Layer                                                   │
│  ├─ APIEndpoint protocol                                                    │
│  ├─ APIClient                                                               │
│  ├─ AuthInterceptor                                                         │
│  └─ NetworkMonitor                                                          │
│                                                                              │
│  STEP 4: Domain Layer (Auth)                                                │
│  ├─ User entity                                                             │
│  ├─ AuthRepositoryProtocol                                                  │
│  ├─ LoginUseCase                                                            │
│  └─ LogoutUseCase                                                           │
│                                                                              │
│  STEP 5: Data Layer (Auth)                                                  │
│  ├─ AuthEndpoints                                                           │
│  ├─ UserDTO                                                                 │
│  └─ AuthRepository                                                          │
│                                                                              │
│  STEP 6: Presentation Layer (Auth)                                          │
│  ├─ LoginView                                                               │
│  ├─ LoginViewModel                                                          │
│  └─ AuthCoordinator                                                         │
│                                                                              │
│  STEP 7: Tests (Auth)                                                       │
│  ├─ LoginUseCaseTests                                                       │
│  ├─ AuthRepositoryTests                                                     │
│  └─ LoginViewModelTests                                                     │
│                                                                              │
│  STEP 8: Code Review                                                        │
│  └─ Review all generated code                                               │
│                                                                              │
│  STEP 9: CLAUDE.md Validation                                               │
│  └─ Enforce zero-tolerance standards                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 Tasks: Core Foundation

### Task 1.1: Create Project Structure

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: None

**Instructions**:
Create the following folder structure under `/mobile-apps/nebula-ai-ios-app/OpenMeet/`:

```
OpenMeet/
├── App/
├── Core/
│   ├── DI/
│   ├── Security/
│   ├── Logging/
│   ├── Extensions/
│   └── Utilities/
├── Domain/
│   ├── Entities/
│   ├── UseCases/
│   │   ├── Auth/
│   │   ├── Meetings/
│   │   └── AI/
│   └── Repositories/
├── Data/
│   ├── Network/
│   │   └── Endpoints/
│   ├── DTOs/
│   │   └── Mappers/
│   ├── Repositories/
│   └── Persistence/
│       └── SyncEngine/
├── Features/
│   ├── Auth/
│   │   ├── Views/
│   │   ├── ViewModels/
│   │   └── Coordinator/
│   ├── Meetings/
│   ├── Player/
│   ├── AI/
│   ├── Revenue/
│   └── Settings/
├── Navigation/
└── Resources/
```

**Verification**:
```bash
ls -la /mobile-apps/nebula-ai-ios-app/OpenMeet/
# Expected: All folders exist
```

---

### Task 1.2: Configure Swift Package Manager

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: Task 1.1

**Instructions**:
Create `Package.swift` with the following dependencies:

```swift
// Package.swift
// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "OpenMeet",
    platforms: [
        .iOS(.v17)
    ],
    dependencies: [
        .package(url: "https://github.com/hmlongco/Factory.git", from: "2.3.0"),
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
        .package(url: "https://github.com/getsentry/sentry-cocoa.git", from: "8.20.0"),
    ],
    targets: [
        .target(
            name: "OpenMeet",
            dependencies: [
                "Factory",
                "KeychainAccess",
                .product(name: "Sentry", package: "sentry-cocoa"),
            ]
        ),
        .testTarget(
            name: "OpenMeetTests",
            dependencies: ["OpenMeet"]
        ),
    ]
)
```

**Verification**:
```bash
swift package resolve
# Expected: Package resolved successfully
```

---

### Task 1.3: Create KeychainManager

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: Task 1.2

**File**: `OpenMeet/Core/Security/KeychainManager.swift`

**Instructions**:
Implement secure storage using iOS Keychain. Reference the architecture document for the full implementation pattern.

**Requirements**:
- Protocol-based design
- `.whenUnlockedThisDeviceOnly` accessibility
- No iCloud sync
- All error cases handled
- Unit tests required

**CLAUDE.md Compliance**:
- NO UserDefaults storage
- NO hardcoded keys
- NO empty catch blocks
- Full error handling

**Verification**:
```swift
// Unit test must pass
func testKeychainStorage() async throws {
    let keychain = KeychainManager()
    try keychain.set("test-token", for: .accessToken)
    let retrieved = try keychain.getString(.accessToken)
    XCTAssertEqual(retrieved, "test-token")
    try keychain.delete(.accessToken)
    XCTAssertNil(try keychain.getString(.accessToken))
}
```

---

### Task 1.4: Create BiometricAuthenticator

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.3

**File**: `OpenMeet/Core/Security/BiometricAuthenticator.swift`

**Instructions**:
Implement Face ID/Touch ID authentication using LocalAuthentication framework.

**Requirements**:
- Protocol-based design
- Detect available biometric type
- Async/await authentication
- Proper error handling

**CLAUDE.md Compliance**:
- Real LAContext, no mocks
- Actual biometric hardware check
- No simulated authentication

---

### Task 1.5: Create AppLogger

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.1

**File**: `OpenMeet/Core/Logging/AppLogger.swift`

**Instructions**:
Implement structured logging using os_log.

**Requirements**:
- Protocol-based design
- Log levels: debug, info, warning, error
- Include file/function/line context
- Sentry integration for errors
- NO sensitive data logging

**CLAUDE.md Compliance**:
- NO print() statements
- NO NSLog
- NO logging tokens/passwords
- Structured JSON format

---

### Task 1.6: Create DI Container

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: Task 1.3, Task 1.4, Task 1.5

**File**: `OpenMeet/Core/DI/Container+Registrations.swift`

**Instructions**:
Implement Factory-based dependency injection container with all registrations.

**Requirements**:
- Register all infrastructure services
- Register all repositories
- Register all use cases
- Register all view models
- Singleton for stateful services
- Factory for stateless services

---

### Task 1.7: Create APIEndpoint Protocol

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: Task 1.1

**File**: `OpenMeet/Data/Network/APIEndpoint.swift`

**Instructions**:
Create type-safe endpoint definition protocol.

```swift
protocol APIEndpoint {
    var baseURL: URL { get }
    var path: String { get }
    var method: HTTPMethod { get }
    var headers: [String: String] { get }
    var queryParameters: [String: String]? { get }
    var body: Encodable? { get }

    func asURLRequest() throws -> URLRequest
}
```

---

### Task 1.8: Create APIClient

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: Task 1.7, Task 1.5

**File**: `OpenMeet/Data/Network/APIClient.swift`

**Instructions**:
Implement production-grade API client with:
- URLSession-based networking
- JSON decoding with ISO8601 dates
- Exponential backoff retry (3 attempts)
- Certificate pinning integration
- Request/response logging
- Error mapping

**CLAUDE.md Compliance**:
- Real network calls only
- No mock responses
- No hardcoded data
- Proper timeout handling
- All errors logged

**Verification**:
```bash
# Integration test against real API
curl -sf https://api.openmeet.com/health
# Expected: 200 OK
```

---

### Task 1.9: Create AuthInterceptor

**Agent**: implementation-bot
**Priority**: Critical
**Depends On**: Task 1.8, Task 1.3

**File**: `OpenMeet/Data/Network/AuthInterceptor.swift`

**Instructions**:
Implement actor-based token management:
- Inject access token into requests
- Handle 401 responses
- Coalesced token refresh (one at a time)
- Queue requests during refresh

**CLAUDE.md Compliance**:
- Tokens from Keychain only
- No hardcoded tokens
- Thread-safe with actor

---

### Task 1.10: Create User Entity

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.1

**File**: `OpenMeet/Domain/Entities/User.swift`

**Instructions**:
Create pure domain model:

```swift
struct User: Identifiable, Equatable, Sendable {
    let id: UUID
    let email: String
    let firstName: String
    let lastName: String
    let organizationId: UUID
    let role: UserRole
    let avatarURL: URL?
    let createdAt: Date

    var fullName: String {
        "\(firstName) \(lastName)"
    }
}

enum UserRole: String, Codable, Sendable {
    case admin
    case member
    case viewer
}
```

---

### Task 1.11: Create AuthRepositoryProtocol

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.10

**File**: `OpenMeet/Domain/Repositories/AuthRepositoryProtocol.swift`

**Instructions**:
Define authentication repository contract:

```swift
protocol AuthRepositoryProtocol {
    func login(email: String, password: String) async throws -> User
    func register(email: String, password: String, firstName: String, lastName: String) async throws -> User
    func refreshToken() async throws -> TokenPair
    func logout() async throws
    func getCurrentUser() async throws -> User
}
```

---

### Task 1.12: Create AuthEndpoints

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.7

**File**: `OpenMeet/Data/Network/Endpoints/AuthEndpoints.swift`

**Instructions**:
Define authentication API endpoints matching backend routes in `/apps/api/src/routes/auth.ts`:

```swift
enum AuthEndpoint: APIEndpoint {
    case login(email: String, password: String)
    case register(email: String, password: String, firstName: String, lastName: String)
    case refresh(refreshToken: String)
    case logout
    case me

    // Implement APIEndpoint protocol
}
```

---

### Task 1.13: Create UserDTO

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.10

**File**: `OpenMeet/Data/DTOs/UserDTO.swift`

**Instructions**:
Create data transfer object matching API response:

```swift
struct UserDTO: Decodable {
    let id: String
    let email: String
    let firstName: String
    let lastName: String
    let organizationId: String
    let role: String
    let avatarUrl: String?
    let createdAt: String

    func toDomain() -> User {
        User(
            id: UUID(uuidString: id) ?? UUID(),
            email: email,
            firstName: firstName,
            lastName: lastName,
            organizationId: UUID(uuidString: organizationId) ?? UUID(),
            role: UserRole(rawValue: role) ?? .member,
            avatarURL: avatarUrl.flatMap { URL(string: $0) },
            createdAt: ISO8601DateFormatter().date(from: createdAt) ?? Date()
        )
    }
}
```

---

### Task 1.14: Create AuthRepository

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.11, Task 1.12, Task 1.13, Task 1.8, Task 1.3

**File**: `OpenMeet/Data/Repositories/AuthRepository.swift`

**Instructions**:
Implement AuthRepositoryProtocol:

```swift
final class AuthRepository: AuthRepositoryProtocol {
    private let apiClient: APIClientProtocol
    private let keychainManager: KeychainManagerProtocol

    init(apiClient: APIClientProtocol, keychainManager: KeychainManagerProtocol) {
        self.apiClient = apiClient
        self.keychainManager = keychainManager
    }

    func login(email: String, password: String) async throws -> User {
        let response: LoginResponseDTO = try await apiClient.request(
            AuthEndpoint.login(email: email, password: password)
        )

        try keychainManager.set(response.accessToken, for: .accessToken)
        try keychainManager.set(response.refreshToken, for: .refreshToken)

        return response.user.toDomain()
    }

    // Implement other methods...
}
```

**CLAUDE.md Compliance**:
- Real API calls
- Tokens in Keychain
- No mock data

---

### Task 1.15: Create LoginUseCase

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.14, Task 1.4

**File**: `OpenMeet/Domain/UseCases/Auth/LoginUseCase.swift`

**Instructions**:
Implement login business logic:

```swift
protocol LoginUseCaseProtocol {
    func execute(email: String, password: String) async throws -> User
    func executeBiometric() async throws -> User
}

final class LoginUseCase: LoginUseCaseProtocol {
    private let authRepository: AuthRepositoryProtocol
    private let biometricAuthenticator: BiometricAuthenticatorProtocol

    func execute(email: String, password: String) async throws -> User {
        // Validate input
        guard email.contains("@") else {
            throw AuthError.invalidEmail
        }
        guard password.count >= 8 else {
            throw AuthError.weakPassword
        }

        return try await authRepository.login(email: email, password: password)
    }

    func executeBiometric() async throws -> User {
        guard try await biometricAuthenticator.authenticate(reason: "Login to OpenMeet") else {
            throw AuthError.biometricFailed
        }

        return try await authRepository.getCurrentUser()
    }
}
```

---

### Task 1.16: Create LoginView

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.15

**File**: `OpenMeet/Features/Auth/Views/LoginView.swift`

**Instructions**:
Implement SwiftUI login screen:

```swift
struct LoginView: View {
    @State private var viewModel: LoginViewModel

    var body: some View {
        Form {
            Section {
                TextField("Email", text: $viewModel.email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)

                SecureField("Password", text: $viewModel.password)
                    .textContentType(.password)
            }

            Section {
                Button(action: { Task { await viewModel.login() } }) {
                    if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("Login")
                    }
                }
                .disabled(viewModel.isLoading || !viewModel.isValid)
            }

            if viewModel.biometricType != .none {
                Section {
                    Button(action: { Task { await viewModel.loginWithBiometric() } }) {
                        Label("Login with \(viewModel.biometricType.name)",
                              systemImage: viewModel.biometricType.icon)
                    }
                }
            }
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK") { }
        } message: {
            Text(viewModel.errorMessage ?? "Unknown error")
        }
    }
}
```

---

### Task 1.17: Create LoginViewModel

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.15, Task 1.4

**File**: `OpenMeet/Features/Auth/ViewModels/LoginViewModel.swift`

**Instructions**:
Implement @Observable view model:

```swift
@Observable
final class LoginViewModel {
    var email = ""
    var password = ""
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    var showError = false

    private let loginUseCase: LoginUseCaseProtocol
    private let biometricAuthenticator: BiometricAuthenticatorProtocol
    var onLoginSuccess: ((User) -> Void)?

    var isValid: Bool {
        email.contains("@") && password.count >= 8
    }

    var biometricType: BiometricType {
        biometricAuthenticator.biometricType
    }

    func login() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let user = try await loginUseCase.execute(email: email, password: password)
            onLoginSuccess?(user)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    func loginWithBiometric() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let user = try await loginUseCase.executeBiometric()
            onLoginSuccess?(user)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
```

---

### Task 1.18: Create App Entry Point

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.6, Task 1.16

**File**: `OpenMeet/App/OpenMeetApp.swift`

**Instructions**:
Create SwiftUI app entry point:

```swift
import SwiftUI
import Factory
import Sentry

@main
struct OpenMeetApp: App {
    init() {
        setupSentry()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }

    private func setupSentry() {
        #if !DEBUG
        SentrySDK.start { options in
            options.dsn = Environment.sentryDSN
            options.enableAutoSessionTracking = true
            options.enableCrashHandler = true
            options.enableOutOfMemoryTracking = true
        }
        #endif
    }
}

struct RootView: View {
    @State private var isAuthenticated = false

    var body: some View {
        if isAuthenticated {
            MainTabView()
        } else {
            LoginView(viewModel: Container.shared.loginViewModel())
                .onAppear {
                    checkAuthentication()
                }
        }
    }

    private func checkAuthentication() {
        // Check for existing tokens
    }
}
```

---

## Phase 2 Tasks: Meetings Core

### Task 2.1: Create Meeting Entity

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Phase 1 Complete

**File**: `OpenMeet/Domain/Entities/Meeting.swift`

**Instructions**:
```swift
struct Meeting: Identifiable, Equatable, Sendable {
    let id: UUID
    let title: String
    let date: Date
    let duration: TimeInterval
    let participants: [Participant]
    let transcriptStatus: TranscriptStatus
    let audioURL: URL?
    let videoURL: URL?
    let summary: String?
    let organizationId: UUID
    let createdBy: UUID
    let createdAt: Date
    let updatedAt: Date
}

enum TranscriptStatus: String, Codable, Sendable {
    case processing
    case ready
    case failed
    case none
}

struct Participant: Identifiable, Equatable, Sendable {
    let id: UUID
    let name: String
    let email: String?
    let speakingTime: TimeInterval
    let role: ParticipantRole
}
```

---

### Task 2.2: Create MeetingsRepositoryProtocol

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.1

**File**: `OpenMeet/Domain/Repositories/MeetingsRepositoryProtocol.swift`

**Instructions**:
```swift
protocol MeetingsRepositoryProtocol {
    func getMeetings(filter: MeetingFilter?, page: Int, pageSize: Int) async throws -> PaginatedResult<Meeting>
    func getMeeting(id: UUID) async throws -> Meeting
    func searchMeetings(query: String) async throws -> [Meeting]
    func deleteMeeting(id: UUID) async throws
    func downloadMeeting(id: UUID, progress: @escaping (Double) -> Void) async throws
}

struct MeetingFilter {
    var dateRange: ClosedRange<Date>?
    var status: TranscriptStatus?
    var participantIds: [UUID]?
    var sortBy: MeetingSortField
    var sortOrder: SortOrder
}
```

---

### Task 2.3: Create MeetingsEndpoints

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.7

**File**: `OpenMeet/Data/Network/Endpoints/MeetingsEndpoints.swift`

**Instructions**:
Define endpoints matching backend routes in `/apps/api/src/routes/meetings.ts`.

---

### Task 2.4: Create MeetingsRepository

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.2, Task 2.3

**File**: `OpenMeet/Data/Repositories/MeetingsRepository.swift`

---

### Task 2.5: Create GetMeetingsUseCase

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.4

**File**: `OpenMeet/Domain/UseCases/Meetings/GetMeetingsUseCase.swift`

---

### Task 2.6: Create MeetingsListView

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.5

**File**: `OpenMeet/Features/Meetings/Views/MeetingsListView.swift`

**Instructions**:
Implement with LazyVStack for performance, pull-to-refresh, and pagination.

---

### Task 2.7: Create MeetingsListViewModel

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.5

**File**: `OpenMeet/Features/Meetings/ViewModels/MeetingsListViewModel.swift`

---

### Task 2.8: Create AudioPlayerService

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Phase 1 Complete

**File**: `OpenMeet/Features/Player/Services/AudioPlayerService.swift`

**Instructions**:
Implement AVPlayer-based audio playback with background audio support.

---

### Task 2.9: Create TranscriptSyncService

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.8

**File**: `OpenMeet/Features/Player/Services/TranscriptSyncService.swift`

---

### Task 2.10: Create Core Data Stack

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.1

**File**: `OpenMeet/Data/Persistence/CoreDataStack.swift`

---

### Task 2.11: Create SyncEngine

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 2.10

**File**: `OpenMeet/Data/Persistence/SyncEngine/SyncEngine.swift`

---

## Phase 3 Tasks: AI Features

### Task 3.1: Create AI Entities

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Phase 2 Complete

**Files**:
- `OpenMeet/Domain/Entities/ChatMessage.swift`
- `OpenMeet/Domain/Entities/Summary.swift`
- `OpenMeet/Domain/Entities/ActionItem.swift`
- `OpenMeet/Domain/Entities/SentimentAnalysis.swift`

---

### Task 3.2: Create AIRepositoryProtocol

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 3.1

**File**: `OpenMeet/Domain/Repositories/AIRepositoryProtocol.swift`

---

### Task 3.3: Create AIEndpoints

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 1.7

**File**: `OpenMeet/Data/Network/Endpoints/AIEndpoints.swift`

---

### Task 3.4: Create AIRepository

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 3.2, Task 3.3

**File**: `OpenMeet/Data/Repositories/AIRepository.swift`

---

### Task 3.5: Create AskAI Feature

**Agent**: implementation-bot
**Priority**: High
**Depends On**: Task 3.4

**Files**:
- `OpenMeet/Features/AI/Views/AskAIView.swift`
- `OpenMeet/Features/AI/ViewModels/AskAIViewModel.swift`

---

## Phase 4 Tasks: Revenue Intelligence

### Task 4.1: Create Revenue Entities

**Agent**: implementation-bot
**Priority**: Medium
**Depends On**: Phase 3 Complete

**Files**:
- `OpenMeet/Domain/Entities/Deal.swift`
- `OpenMeet/Domain/Entities/Pipeline.swift`
- `OpenMeet/Domain/Entities/Scorecard.swift`

---

### Task 4.2: Create Revenue Feature

**Agent**: implementation-bot
**Priority**: Medium
**Depends On**: Task 4.1

**Files**:
- `OpenMeet/Features/Revenue/Views/DealsListView.swift`
- `OpenMeet/Features/Revenue/Views/PipelineKanbanView.swift`
- `OpenMeet/Features/Revenue/ViewModels/DealsViewModel.swift`

---

## Verification Tasks

### Verification Task V1: Unit Test Execution

**Agent**: test-writer
**Priority**: Critical
**Depends On**: Each implementation task

**Instructions**:
Create comprehensive unit tests for every implementation. Target 80%+ coverage.

**Test Files to Create**:
- `OpenMeetTests/Domain/UseCases/Auth/LoginUseCaseTests.swift`
- `OpenMeetTests/Data/Repositories/AuthRepositoryTests.swift`
- `OpenMeetTests/Features/Auth/ViewModels/LoginViewModelTests.swift`
- `OpenMeetTests/Core/Security/KeychainManagerTests.swift`
- `OpenMeetTests/Data/Network/APIClientTests.swift`

---

### Verification Task V2: Code Review

**Agent**: code-reviewer
**Priority**: Critical
**Depends On**: Each implementation task

**Review Criteria**:
1. CLAUDE.md compliance (zero tolerance)
2. No fake/mock implementations
3. No hardcoded data
4. Proper error handling
5. Type safety
6. Code style consistency
7. Performance considerations
8. Security best practices

---

### Verification Task V3: CLAUDE.md Enforcement

**Agent**: ai-guard-enforcer
**Priority**: Critical
**Depends On**: All implementation tasks

**Enforcement Rules**:

```swift
// FORBIDDEN PATTERNS TO DETECT

// 1. Hardcoded data
let meetings = [Meeting(...)] // REJECT

// 2. UserDefaults for tokens
UserDefaults.standard.set(token, forKey: "token") // REJECT

// 3. print() statements
print("Debug: \(response)") // REJECT

// 4. Empty catch blocks
catch { } // REJECT

// 5. Force unwrapping
let user = response.user! // REJECT

// 6. Mock responses
return MockResponse(success: true) // REJECT

// 7. TODO/FIXME comments
// TODO: implement later // REJECT

// 8. Fake async
async func getData() -> Data { return staticData } // REJECT
```

**Scan Command**:
```bash
# Run on all Swift files
for pattern in "let meetings = \[" "UserDefaults" "print(" "catch { }" "TODO" "FIXME" "return Mock"
do
    grep -r "$pattern" --include="*.swift" OpenMeet/
done
```

---

## CLAUDE.md Enforcement Rules

### Rule 1: No Fake Implementations

```
FORBIDDEN:
- return []
- return nil
- return MockData()
- return { success: true }

REQUIRED:
- Real API calls
- Real database queries
- Real Keychain operations
```

### Rule 2: No Hardcoded Data

```
FORBIDDEN:
- let users = [User(...)]
- let apiKey = "sk-xxx"
- let baseURL = "https://api.example.com"

REQUIRED:
- Data from API responses
- Config from Environment/build settings
- Secrets from Keychain
```

### Rule 3: Proper Error Handling

```
FORBIDDEN:
- catch { }
- catch { print(error) }
- try!
- force unwrap (!)

REQUIRED:
- catch { logger.error(...); throw ... }
- try with do/catch
- Optional binding
```

### Rule 4: Secure Token Storage

```
FORBIDDEN:
- UserDefaults.standard.set(token, ...)
- FileManager.default.createFile(...)
- print(token)
- NSLog(token)

REQUIRED:
- KeychainManager.set(token, for: .accessToken)
- No logging of tokens
```

### Rule 5: Structured Logging

```
FORBIDDEN:
- print("...")
- NSLog("...")
- debugPrint(...)

REQUIRED:
- logger.debug("...", metadata: [...])
- logger.error("...", error: error)
```

---

## Agent Execution Summary

| Task ID | Agent | Status | Verification |
|---------|-------|--------|--------------|
| 1.1 | implementation-bot | Pending | Folder exists |
| 1.2 | implementation-bot | Pending | Package resolves |
| 1.3 | implementation-bot | Pending | Unit tests pass |
| 1.4 | implementation-bot | Pending | Unit tests pass |
| 1.5 | implementation-bot | Pending | Unit tests pass |
| 1.6 | implementation-bot | Pending | Compiles |
| 1.7 | implementation-bot | Pending | Compiles |
| 1.8 | implementation-bot | Pending | Integration test |
| 1.9 | implementation-bot | Pending | Unit tests pass |
| 1.10 | implementation-bot | Pending | Compiles |
| 1.11 | implementation-bot | Pending | Compiles |
| 1.12 | implementation-bot | Pending | Compiles |
| 1.13 | implementation-bot | Pending | Compiles |
| 1.14 | implementation-bot | Pending | Unit tests pass |
| 1.15 | implementation-bot | Pending | Unit tests pass |
| 1.16 | implementation-bot | Pending | UI renders |
| 1.17 | implementation-bot | Pending | Unit tests pass |
| 1.18 | implementation-bot | Pending | App launches |
| V1 | test-writer | Pending | 80%+ coverage |
| V2 | code-reviewer | Pending | Review passed |
| V3 | ai-guard-enforcer | Pending | No violations |

---

*Document Version: 1.0.0 | Created: 2025-12-16 | Author: Claude Code*
