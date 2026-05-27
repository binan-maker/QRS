import React, { useState, memo, useMemo, useCallback } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import * as Haptics from "@/lib/haptics";
import { buildQrContent } from "@/features/generator/data/qr-builder";
import { BUILT_IN_CATEGORIES } from "@/features/generator/data/built-in-categories";
import { catColor, POPULAR_IDS } from "@/features/generator/data/category-config";
import type { CategorySchema, FieldDefinition } from "@/lib/schemas/CategorySchema";
import PickerView from "./builder/PickerView";
import FormView, { type BlankField } from "./builder/FormView";
import OutputView, { type QrTheme } from "./builder/OutputView";

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9); }

function scoreCategory(cat: CategorySchema, query: string): number {
  const q = query.toLowerCase();
  let s = 0;
  if (cat.name.toLowerCase().includes(q)) s += 50;
  if (cat.id.toLowerCase().includes(q))   s += 30;
  if (cat.tags.some(t => t.includes(q)))  s += 20;
  if (cat.description.toLowerCase().includes(q)) s += 10;
  return s;
}

/* ─────────────────────────────────────────────────────────────
   PROPS
───────────────────────────────────────────────────────────── */
interface Props {
  onBack: () => void;
  onGenerate?: (content: string, label: string) => void;
}

type PageView = "pick" | "form" | "output";

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
function CustomQrBuilderPage({ onBack }: Props) {
  const { colors }  = useTheme();
  const insets      = useSafeAreaInsets();
  const { width }   = useWindowDimensions();
  const topInset    = Platform.OS === "web" ? 0 : insets.top;
  const tabBarH     = 62 + insets.bottom + 8;

  const COLS   = 4;
  const GAP    = 10;
  const SIDE_PAD = 16;
  const tileW  = Math.floor((width - SIDE_PAD * 2 - GAP * (COLS - 1)) / COLS);
  const circleD = tileW - 4;

  /* page state */
  const [view,        setView]        = useState<PageView>("pick");
  const [search,      setSearch]      = useState("");
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [isBlank,     setIsBlank]     = useState(false);
  const [values,      setValues]      = useState<Record<string, string>>({});
  const [blankFields, setBlankFields] = useState<BlankField[]>([
    { id: uid(), label: "Name", value: "" },
    { id: uid(), label: "Info", value: "" },
  ]);
  const [qrContent, setQrContent] = useState("");
  const [qrLabel,   setQrLabel]   = useState("");
  const [qrTheme,   setQrTheme]   = useState<QrTheme>("classic");

  /* derived */
  const selectedCat = useMemo(
    () => BUILT_IN_CATEGORIES.find(c => c.id === selectedId) ?? null,
    [selectedId],
  );
  const primaryField = useMemo(
    () => selectedCat?.fields.find(f => f.isPrimary) ?? null,
    [selectedCat],
  );
  const requiredFields = useMemo<FieldDefinition[]>(
    () => (selectedCat?.fields ?? []).filter(f => f.required !== false && !f.optional),
    [selectedCat],
  );
  const progressFilled = useMemo(
    () => requiredFields.filter(f => (values[f.key] ?? "").trim().length > 0).length,
    [requiredFields, values],
  );
  const canGenerate = useMemo(() => {
    if (isBlank) return blankFields.some(f => f.label.trim() && f.value.trim());
    return progressFilled === requiredFields.length && requiredFields.length > 0;
  }, [isBlank, blankFields, progressFilled, requiredFields]);

  const liveQrContent = useMemo(() => {
    if (isBlank) {
      const filled = blankFields.filter(f => f.label.trim() && f.value.trim());
      return filled.length ? filled.map(f => `${f.label}: ${f.value}`).join("\n") : "";
    }
    if (!selectedCat || !primaryField) return "";
    const pv = (values[primaryField.key] ?? "").trim();
    if (pv.length < 2) return "";
    const extra: Record<string, string> = {};
    for (const f of selectedCat.fields) {
      if (!f.isPrimary) extra[f.key] = values[f.key] ?? "";
    }
    try { return buildQrContent(selectedCat.presetIdx ?? 0, pv, extra); } catch { return ""; }
  }, [isBlank, blankFields, selectedCat, primaryField, values]);

  const qrColors = useMemo(() => {
    const col = catColor(selectedId ?? "");
    if (qrTheme === "dark")    return { fg: "#E2E8F0", bg: "#0F172A" };
    if (qrTheme === "branded") return { fg: col, bg: "#FFFFFF" };
    return { fg: "#000000", bg: "#FFFFFF" };
  }, [qrTheme, selectedId]);

  const searchResults = useMemo(() => {
    const q = search.trim();
    if (!q) return null;
    return BUILT_IN_CATEGORIES
      .map(cat => ({ cat, score: scoreCategory(cat, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score || b.cat.popularity - a.cat.popularity)
      .slice(0, 15)
      .map(x => x.cat);
  }, [search]);

  const popularCats = useMemo(
    () => POPULAR_IDS.map(id => BUILT_IN_CATEGORIES.find(c => c.id === id)).filter(Boolean) as CategorySchema[],
    [],
  );

  /* handlers */
  const pickCategory = useCallback((id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedId(id);
    setIsBlank(false);
    setValues({});
    setSearch("");
    setView("form");
  }, []);

  const pickBlank = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsBlank(true);
    setSelectedId(null);
    setSearch("");
    setView("form");
  }, []);

  const handleGenerate = useCallback(() => {
    if (!canGenerate) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isBlank) {
      const content = blankFields
        .filter(f => f.label.trim() && f.value.trim())
        .map(f => `${f.label}: ${f.value}`)
        .join("\n");
      setQrContent(content);
      setQrLabel("Custom QR");
    } else if (selectedCat && primaryField) {
      const pv = (values[primaryField.key] ?? "").trim();
      const extra: Record<string, string> = {};
      for (const f of selectedCat.fields) {
        if (!f.isPrimary) extra[f.key] = values[f.key] ?? "";
      }
      setQrContent(buildQrContent(selectedCat.presetIdx ?? 0, pv, extra));
      setQrLabel(selectedCat.name);
    }
    setQrTheme("classic");
    setView("output");
  }, [canGenerate, isBlank, blankFields, selectedCat, primaryField, values]);

  const resetAll = useCallback(() => {
    setView("pick");
    setSelectedId(null);
    setIsBlank(false);
    setValues({});
    setSearch("");
    setBlankFields([{ id: uid(), label: "Name", value: "" }, { id: uid(), label: "Info", value: "" }]);
    setQrContent("");
    setQrLabel("");
  }, []);

  const addBlankField = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => [...prev, { id: uid(), label: "", value: "" }]);
  }, []);

  const updateBlankField = useCallback((id: string, patch: Partial<BlankField>) =>
    setBlankFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f)), []);

  const removeBlankField = useCallback((id: string) => {
    if (blankFields.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBlankFields(prev => prev.filter(f => f.id !== id));
  }, [blankFields.length]);

  /* render */
  if (view === "pick") {
    return (
      <PickerView
        search={search}
        setSearch={setSearch}
        searchResults={searchResults}
        popularCats={popularCats}
        tileW={tileW}
        circleD={circleD}
        tabBarH={tabBarH}
        topInset={topInset}
        pickCategory={pickCategory}
        pickBlank={pickBlank}
        onBack={onBack}
      />
    );
  }

  if (view === "form") {
    return (
      <FormView
        isBlank={isBlank}
        selectedCat={selectedCat}
        values={values}
        setValues={setValues}
        blankFields={blankFields}
        requiredFields={requiredFields}
        progressFilled={progressFilled}
        canGenerate={canGenerate}
        liveQrContent={liveQrContent}
        tabBarH={tabBarH}
        topInset={topInset}
        onBack={() => setView("pick")}
        addBlankField={addBlankField}
        updateBlankField={updateBlankField}
        removeBlankField={removeBlankField}
        handleGenerate={handleGenerate}
      />
    );
  }

  return (
    <OutputView
      isBlank={isBlank}
      selectedCat={selectedCat}
      qrContent={qrContent}
      qrLabel={qrLabel}
      qrTheme={qrTheme}
      setQrTheme={setQrTheme}
      qrColors={qrColors}
      tabBarH={tabBarH}
      topInset={topInset}
      onBack={() => setView("form")}
      resetAll={resetAll}
      onBackToHome={onBack}
    />
  );
}

export default memo(CustomQrBuilderPage);
