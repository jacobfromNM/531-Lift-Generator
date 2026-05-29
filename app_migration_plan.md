# 5/3/1 Lift Generator — iOS App Migration Plan

## Recommended Approach: Native SwiftUI

The app's logic is pure math with no server calls or external dependencies, which makes it an ideal candidate for a full native rewrite in **SwiftUI**. This gives you:

- A single codebase that targets **iPhone, iPad, and Mac** natively
- Better performance and feel than a web wrapper
- Native iOS patterns (sheets, haptics, share sheets) that users expect
- `@AppStorage` which maps directly to `localStorage` with zero boilerplate
- A great first SwiftUI project — the scope is well-defined and the logic is self-contained

> **What you'll need:** A Mac with Xcode 15+ (free from the Mac App Store) and an Apple ID. Running on a real device or submitting to the App Store requires the Apple Developer Program ($99/year).

---

## Architecture Mapping (Web → SwiftUI)

| Web concept | SwiftUI equivalent |
|---|---|
| `localStorage` (`531_data`, `531_week`, `531_theme`) | `@AppStorage` / `UserDefaults` |
| CSS custom properties (theme tokens) | `AppTheme` enum with `Color` values, passed via `@EnvironmentObject` |
| `<table>` in lift cards | Custom `Grid` or `VStack`/`HStack` rows with fixed column widths |
| Card `.onclick` → modal | `.sheet()` — slides up from the bottom (native iOS feel) |
| Week tab buttons | Segmented `Picker` or custom tab buttons |
| Hover tooltip (plate breakdown) | Always-visible column (already shown in the table) or long-press `.contextMenu` |
| JSON export | `ShareLink` with a JSON string payload |
| JSON import | `fileImporter` modifier |
| Theme picker card | Settings or inline picker view |
| Help modal | `.sheet()` with `HelpView` |
| `alert()` for validation | `.alert()` modifier |

---

## Project Structure

```
Lift531/
├── Lift531App.swift              # @main entry point, injects environment objects
├── ContentView.swift             # Root scroll view — assembles all sections
│
├── Models/
│   ├── LiftData.swift            # Codable struct: benchPress, squat, deadlift, overheadPress
│   ├── LiftProgram.swift         # getSetsForWeek(), week schemes, WEEK_LABELS
│   └── PlateCalculator.swift     # calculatePlates(), plateTooltip(), roundToNearest5()
│
├── ViewModels/
│   └── AppState.swift            # ObservableObject: liftData, currentWeek, theme; @AppStorage persistence
│
├── Views/
│   ├── InputCardView.swift       # 1RM number fields + ±5/10 stepper buttons + Generate button
│   ├── WeekTabsView.swift        # Week selector row (5 buttons)
│   ├── LiftGridView.swift        # 2-column grid of lift cards (adapts to iPad)
│   ├── LiftCardView.swift        # Individual lift card — tappable, opens sheet
│   ├── LiftDetailSheet.swift     # Full expanded table with row-tap highlighting
│   ├── HelpView.swift            # Onboarding guide sheet (port of help modal)
│   ├── CalculatorsView.swift     # 1RM calculator + reps-needed calculator
│   ├── ThemePickerView.swift     # Theme swatch buttons
│   └── SettingsView.swift        # Export JSON, import JSON, theme (optional nav screen)
│
├── Theme/
│   ├── AppTheme.swift            # enum AppTheme: gruvbox, claude, apprentice, github
│   └── ThemeColors.swift         # Color definitions per theme (maps CSS vars → SwiftUI Color)
│
└── Assets.xcassets/
    ├── AppIcon.appiconset/       # All required icon sizes (Xcode generates from one 1024×1024)
    └── Colors/                   # Named color sets (for system-level dark/light if needed)
```

---

## Key Implementation Details

### 1. State & Persistence

Replace `localStorage` with `@AppStorage`:

```swift
// AppState.swift
class AppState: ObservableObject {
    @AppStorage("531_data")    private var liftDataJSON: String = ""
    @AppStorage("531_week")    var currentWeek: Int = 1
    @AppStorage("531_theme")   var theme: AppTheme = .gruvbox

    @Published var liftData: LiftData? {
        didSet {
            liftDataJSON = (try? JSONEncoder().encode(liftData))
                .flatMap { String(data: $0, encoding: .utf8) } ?? ""
        }
    }

    init() {
        if let data = liftDataJSON.data(using: .utf8) {
            liftData = try? JSONDecoder().decode(LiftData.self, from: data)
        }
    }
}
```

### 2. Math — Direct Port

The math functions translate to Swift with no logic changes:

```swift
// PlateCalculator.swift
func roundToNearest5(_ x: Double) -> Int { Int((x / 5).rounded()) * 5 }

func calculatePlates(weight: Int) -> [Double] {
    let plates: [Double] = [45, 35, 25, 15, 10, 5, 2.5]
    var remaining = Double(weight)
    var result: [Double] = []
    for plate in plates {
        while remaining >= plate { result.append(plate); remaining -= plate }
    }
    return result
}

func plateTooltip(weight: Int) -> String {
    let plates = calculatePlates(weight: (weight - 45) / 2)
    return plates.isEmpty ? "Bar Only" : plates.map { "\($0) lbs" }.joined(separator: " + ")
}
```

### 3. Theming

Define all four themes as a Swift enum. Pass colors through the view hierarchy via `@EnvironmentObject`:

```swift
// AppTheme.swift
enum AppTheme: String, CaseIterable, Codable {
    case gruvbox, claude, apprentice, github

    var background: Color { ... }
    var foreground: Color { ... }
    var benchAccent: Color { ... }
    var squatAccent: Color { ... }
    var deadliftAccent: Color { ... }
    var ohpAccent: Color { ... }
    // one property per CSS variable group
}
```

### 4. Lift Cards & Tables

SwiftUI's `Grid` (iOS 16+) or manual `HStack` with `.frame(width:)` replaces HTML tables cleanly:

```swift
// LiftCardView.swift — table row
HStack(spacing: 0) {
    Text(row.label).frame(width: 50)
    Text("\(row.percent)%").frame(width: 55)
    Text("\(row.weight) lbs").frame(maxWidth: .infinity).bold()
    Text(row.reps).frame(width: 55).foregroundColor(liftColor)
    Text(row.plates).frame(maxWidth: .infinity).font(.caption)
}
.background(row.isHighlighted ? highlightColor : Color.clear)
.onTapGesture { row.isHighlighted.toggle() }
```

### 5. Lift Detail Sheet (replaces Modal)

```swift
// LiftCardView.swift
.sheet(isPresented: $showDetail) {
    LiftDetailSheet(lift: lift, week: appState.currentWeek)
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
}
```

On iOS 16+ you also get `.presentationDetents([.medium, .large])` for a half-sheet that the user can drag up to expand.

### 6. Week Tabs

```swift
// WeekTabsView.swift
ScrollView(.horizontal, showsIndicators: false) {
    HStack(spacing: 8) {
        ForEach(1...5, id: \.self) { week in
            WeekTabButton(week: week, isSelected: appState.currentWeek == week) {
                appState.currentWeek = week
            }
        }
    }
    .padding(.horizontal)
}
```

### 7. JSON Export & Import

```swift
// Export via system share sheet
ShareLink(item: exportJSON(), preview: SharePreview("531 Lift Data"))

// Import via file picker
.fileImporter(isPresented: $showImporter, allowedContentTypes: [.json]) { result in
    guard let url = try? result.get(),
          url.startAccessingSecurityScopedResource() else { return }
    defer { url.stopAccessingSecurityScopedResource() }
    if let data = try? Data(contentsOf: url) {
        appState.liftData = try? JSONDecoder().decode(LiftData.self, from: data)
    }
}
```

### 8. Font

**Option A (recommended):** Use **SF Pro** (Apple's system font) — looks excellent, is already on every Apple device, no embedding needed. Use `.font(.system(..., design: .rounded))` for a similar feel to Lexend.

**Option B:** Embed Lexend by downloading the `.ttf` files from Google Fonts, adding them to the Xcode bundle, and registering under `UIAppFonts` in `Info.plist`. Use `.font(.custom("Lexend", size: 15))`.

### 9. iPad Layout

Use `LazyVGrid` with `.adaptive` columns — SwiftUI automatically places 1 column on iPhone, 2 on iPad, with no breakpoints needed:

```swift
LazyVGrid(columns: [GridItem(.adaptive(minimum: 340))], spacing: 14) {
    ForEach(lifts) { lift in LiftCardView(lift: lift) }
}
```

For a more iPad-native feel, wrap the whole app in `NavigationSplitView` to show the input card in a sidebar and the lift cards in the detail pane.

### 10. Mac Support

In Xcode's target settings, check **"Mac Catalyst"** to get a Mac app with almost no extra work. Minor Mac-specific improvements worth adding:

- Hover tooltips via `.help("plate breakdown text")` replace long-press
- Keyboard shortcuts (`onKeyPress`, `.keyboardShortcut`) for week navigation (1–5)
- The app automatically gets a proper window with a menu bar

---

## Improvements Over the Web App

These are natural wins from going native — all aligned with the existing look and feel:

| Feature | Web | iOS/Mac native |
|---|---|---|
| Haptic feedback | None | `UIImpactFeedbackGenerator` on stepper taps and row highlights |
| Plate tooltip | Desktop hover only | Always-visible in table column; popover on long-press on Mac |
| "Too small screen" warning | Shown below 460px | Not needed — SwiftUI handles all screen sizes automatically |
| Week navigation | Tap only | Can also swipe left/right to advance weeks |
| Data persistence | `localStorage` (browser can clear it) | `UserDefaults` — survives app updates, much more durable |
| iCloud sync | Not possible | `NSUbiquitousKeyValueStore` — trivial to add, same API shape |
| Home screen icon | PWA icon | Proper App Store icon with all required sizes |
| Offline | Requires service worker setup | Always offline — no network needed at all |
| Fonts | Google Fonts CDN (needs internet on first load) | Embedded or SF Pro (always available) |
| Row highlighting | Session only, lost on refresh | Can persist to `UserDefaults` across sessions |

**Stretch goals (post-MVP):**
- **Home screen widget** (WidgetKit) — shows current week + training maxes on the lock screen
- **Siri Shortcuts** — "Hey Siri, what's my bench press for today?"
- **iCloud sync** — share data across iPhone, iPad, and Mac automatically via CloudKit
- **Apple Watch app** — read-only glance at current week's weights

---

## Step-by-Step Getting Started

1. **Install Xcode** from the Mac App Store (free, ~10 GB)
2. **Work through Apple's free [SwiftUI tutorial](https://developer.apple.com/tutorials/swiftui)** (the "Landmarks" app) — you'll learn 80% of what you need
3. **Create a new project:** File → New → Project → iOS → App (SwiftUI, no CoreData)
4. **Port the models first** (`LiftData`, `LiftProgram`, `PlateCalculator`) — pure Swift, no UI, easy to verify correctness
5. **Create `AppState`** with `@AppStorage` and confirm persistence works in the simulator
6. **Build `ContentView`** as a `ScrollView` with `VStack` — add placeholder `Text` views for each section
7. **Build `InputCardView`** with `TextField` (numeric keyboard) and stepper buttons
8. **Build `WeekTabsView`** and wire to `appState.currentWeek`
9. **Build `LiftCardView`** with custom table rows; add `.sheet` for the detail view
10. **Build `LiftDetailSheet`** with row-tap highlighting state
11. **Build `ThemePickerView`** and `AppTheme`; wire colors through `@EnvironmentObject`
12. **Build `CalculatorsView`** (direct port of the two calculators)
13. **Add export/import** via `ShareLink` and `fileImporter`
14. **Test on iPhone and iPad simulators** (built into Xcode)
15. **Add the app icon** — drop one 1024×1024 PNG into `Assets.xcassets` and Xcode generates all sizes
16. **Enable Mac Catalyst** in target settings → run on your Mac
17. **Enroll in Apple Developer Program** ($99/year) and submit to App Store via App Store Connect

---

## Rough Timeline (learning SwiftUI from scratch)

| Phase | Duration | Goal |
|---|---|---|
| Setup + SwiftUI basics | 3–5 days | Xcode running, Landmarks tutorial done |
| Port models + state | 1–2 days | Math functions in Swift, persistence verified |
| Core views | 1 week | Input card, week tabs, lift card grid |
| Sheets + theme | 3–4 days | Detail sheet, help sheet, all four themes |
| Calculators + data I/O | 2–3 days | Both calculators, export, import |
| iPad + Mac polish | 3–4 days | Adaptive grid, Mac Catalyst, keyboard shortcuts |
| App Store prep | 2–3 days | Screenshots, listing text, review submission |
| **Total** | **~4–5 weeks** | Shipped app |
