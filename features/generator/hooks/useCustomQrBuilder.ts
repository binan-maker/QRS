import { useState, useMemo, useCallback } from "react";
import * as Haptics from "@/shared/utils/haptics";
import {
  STARTER_TEMPLATES, FIELD_TYPES, FIELD_TYPE_MAP,
  uid, buildOutput,
  type CustomField, type StarterTemplate,
} from "@/features/generator/data/starter-templates";

export type Step = "pick" | "build" | "fill";

export interface UseCustomQrBuilderOptions {
  onGenerate: (content: string, label: string) => void;
}

export function useCustomQrBuilder({ onGenerate }: UseCustomQrBuilderOptions) {
  const [step, setStep] = useState<Step>("pick");
  const [templateName, setTemplateName] = useState("");
  const [outputTemplate, setOutputTemplate] = useState("");
  const [fields, setFields] = useState<CustomField[]>([
    { id: uid(), key: "value", label: "Main Field", type: "text" },
  ]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [firstFocus, setFirstFocus] = useState<Record<string, boolean>>({});

  const resetWizard = useCallback(() => {
    setStep("pick");
    setTemplateName("");
    setOutputTemplate("");
    setFields([{ id: uid(), key: "value", label: "Main Field", type: "text" }]);
    setFieldValues({});
    setFirstFocus({});
  }, []);

  const applyTemplate = useCallback((t: StarterTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTemplateName(t.name);
    setOutputTemplate(t.template);
    setFields(t.fields.map(f => ({ ...f, id: uid() })));
    setFieldValues({});
    setFirstFocus({});
    setStep("build");
  }, []);

  const startBlank = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTemplateName("");
    setOutputTemplate("");
    setFields([{ id: uid(), key: "value", label: "Main Field", type: "text" }]);
    setFieldValues({});
    setFirstFocus({});
    setStep("build");
  }, []);

  const addField = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFields(prev => {
      const n = prev.length + 1;
      return [...prev, { id: uid(), key: `field${n}`, label: `Field ${n}`, type: "text" }];
    });
  }, []);

  const removeField = useCallback((id: string) => {
    setFields(prev => {
      if (prev.length <= 1) return prev;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const updateField = useCallback((id: string, patch: Partial<CustomField>) => {
    setFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      const updated = { ...f, ...patch };
      if (patch.label !== undefined) {
        updated.key = patch.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 20) || `field_${id.slice(0, 4)}`;
      }
      return updated;
    }));
  }, []);

  const missingKeys = useMemo(() => {
    const matches = outputTemplate.match(/\{\{(\w+)\}\}/g) ?? [];
    const templateKeys = new Set(matches.map(m => m.slice(2, -2)));
    const fieldKeys = new Set(fields.map(f => f.key));
    return [...templateKeys].filter(k => !fieldKeys.has(k));
  }, [outputTemplate, fields]);

  const canProceed = outputTemplate.trim().length > 0 && missingKeys.length === 0;

  const goToFill = useCallback(() => {
    if (outputTemplate.trim().length === 0 || missingKeys.length > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFieldValues({});
    setFirstFocus({});
    setStep("fill");
  }, [outputTemplate, missingKeys]);

  const livePreview = useMemo(
    () => buildOutput(outputTemplate, fields, fieldValues),
    [outputTemplate, fields, fieldValues]
  );

  const isComplete = useMemo(
    () => fields.every(f => (fieldValues[f.key] ?? "").trim().length > 0),
    [fields, fieldValues]
  );

  const handleGenerate = useCallback(() => {
    if (!isComplete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onGenerate(livePreview, templateName.trim() || "Custom QR");
  }, [isComplete, livePreview, templateName, onGenerate]);

  return {
    step, setStep,
    templateName, setTemplateName,
    outputTemplate, setOutputTemplate,
    fields, setFields,
    fieldValues, setFieldValues,
    firstFocus, setFirstFocus,
    missingKeys, canProceed,
    livePreview, isComplete,
    resetWizard,
    applyTemplate, startBlank,
    addField, removeField, updateField,
    goToFill, handleGenerate,
    STARTER_TEMPLATES, FIELD_TYPES, FIELD_TYPE_MAP,
  };
}
