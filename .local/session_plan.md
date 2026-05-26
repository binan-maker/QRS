# Objective
Organize the generator feature: split the 3 large files (1000+ lines each) into focused sub-components, extract data/utility helpers, and fix prop-drilling of `colors`/`rf`/`sp` in `QrTemplateModal`.

# Tasks

### T001: Create builder sub-components (independent leaf files)
- **Blocked By**: []
- `features/generator/components/builder/builderStyles.ts` — all S.xxx styles from CustomQrBuilderPage
- `features/generator/components/builder/CircleTile.tsx` — extracted sub-component
- `features/generator/components/builder/FieldCircle.tsx` — extracted sub-component

### T002: Create builder view components
- **Blocked By**: [T001]
- `features/generator/components/builder/PickerView.tsx` — pick view JSX
- `features/generator/components/builder/FormView.tsx` — form view JSX
- `features/generator/components/builder/OutputView.tsx` — output view JSX

### T003: Rewrite CustomQrBuilderPage.tsx as thin orchestrator
- **Blocked By**: [T002]
- ~100 lines: state + handlers + conditional render of view components

### T004: Extract CustomQrBuilderModal data
- **Blocked By**: []
- `features/generator/data/starter-templates.ts` — STARTER_TEMPLATES, FIELD_TYPES, FIELD_TYPE_MAP, uid(), buildOutput(), parseTemplateTokens()

### T005: Rewrite CustomQrBuilderModal.tsx as thin orchestrator
- **Blocked By**: [T004]
- Remove data/helpers, keep only modal shell + step orchestration (~250 lines)

### T006: Extract QrTemplateModal view components
- **Blocked By**: []
- `features/generator/components/template-modal/HomeView.tsx`
- `features/generator/components/template-modal/AiView.tsx`
- `features/generator/components/template-modal/BuilderView.tsx` (includes FieldInput)

### T007: Rewrite QrTemplateModal.tsx as thin orchestrator
- **Blocked By**: [T006]
- Remove inline view functions, keep modal shell + view routing (~100 lines)

### T008: Fix TemplatePickerModal.tsx local sub-components
- **Blocked By**: []
- Remove `colors` prop from SectionHeader/CategoryRow/EmptyState; use useTheme() internally

# Key Files
- CustomQrBuilderPage.tsx (1170→~100 lines)
- CustomQrBuilderModal.tsx (1085→~250 lines)
- QrTemplateModal.tsx (1013→~100 lines)
- TemplatePickerModal.tsx (394→minor fix)

# Done When
All 3 big files are thin orchestrators, view logic lives in focused sub-component files.
