"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { studentsApi } from "@/lib/api";
import { IngestResult, StudentProfile } from "@/lib/types";

type Step = "upload" | "review";

function TagInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) onChange([...value, trimmed]);
    setInput("");
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="tag cursor-pointer hover:bg-red-50 hover:text-red-600"
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            {tag} ×
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Type and press Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button type="button" className="btn-secondary py-2 px-4" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

export default function StudentOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [freeText, setFreeText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Partial<StudentProfile>>({
    academic_year: "",
    major: "",
    skills: [],
    interests: [],
    gpa_range: "",
    preferred_domains: [],
    hours_per_week: undefined,
    start_date: "",
    remote_preference: "hybrid",
    bio: "",
    is_anonymous: false,
  });

  async function handleParse() {
    setParsing(true);
    setParseError("");
    try {
      let res;
      if (file) {
        res = await studentsApi.ingestFile(file);
      } else if (freeText.trim()) {
        res = await studentsApi.ingestFreeText(freeText);
      } else {
        setParseError("Please paste some text or upload a file.");
        setParsing(false);
        return;
      }
      const result: IngestResult = res.data;
      setProfile((p) => ({
        ...p,
        academic_year: result.academic_year || p.academic_year,
        major: result.major || p.major,
        skills: result.skills.length ? result.skills : p.skills,
        interests: result.interests.length ? result.interests : p.interests,
        gpa_range: result.gpa_range || p.gpa_range,
        bio: result.summary || p.bio,
      }));
      setStep("review");
    } catch {
      setParseError("Parsing failed. You can still fill in your profile manually.");
      setStep("review");
    } finally {
      setParsing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await studentsApi.updateMyProfile(profile);
      router.push("/discover");
    } catch {
      // handle gracefully
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className={`h-2 flex-1 rounded-full ${step === "upload" ? "bg-brand-600" : "bg-brand-200"}`}
          />
          <div
            className={`h-2 flex-1 rounded-full ${step === "review" ? "bg-brand-600" : "bg-slate-200"}`}
          />
        </div>

        {step === "upload" && (
          <div className="card">
            <h1 className="text-2xl font-bold text-brand-900 mb-1">Tell us about yourself</h1>
            <p className="text-sm text-slate-500 mb-6">
              Paste your resume text or upload a file — our AI will extract your skills and interests
              automatically.
            </p>

            {parseError && (
              <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-3 text-sm text-yellow-700">
                {parseError}
              </div>
            )}

            <div className="mb-4">
              <label className="label">Paste resume / bio text</label>
              <textarea
                className="input min-h-[180px] resize-y"
                placeholder="e.g. I am a junior studying Computer Science at MIT with a 3.8 GPA. I have experience in Python, machine learning, and data visualization. I am interested in AI safety and computational neuroscience..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-xs text-slate-400">or</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <div>
              <label className="label">Upload resume (PDF / DOCX / TXT)</label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex gap-3 mt-8">
              <button className="btn-primary flex-1" onClick={handleParse} disabled={parsing}>
                {parsing ? "Parsing…" : "Parse with AI →"}
              </button>
              <button className="btn-secondary" onClick={() => setStep("review")}>
                Skip, fill manually
              </button>
            </div>
          </div>
        )}

        {step === "review" && (
          <form className="card space-y-6" onSubmit={handleSave}>
            <div>
              <h1 className="text-2xl font-bold text-brand-900 mb-1">Review your profile</h1>
              <p className="text-sm text-slate-500">
                AI-extracted fields are pre-filled. Edit anything that looks wrong.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Academic year</label>
                <select
                  className="input"
                  value={profile.academic_year || ""}
                  onChange={(e) => setProfile({ ...profile, academic_year: e.target.value })}
                >
                  <option value="">Select…</option>
                  {["Freshman", "Sophomore", "Junior", "Senior", "Masters", "PhD"].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Major / Field of study</label>
                <input
                  className="input"
                  placeholder="e.g. Computer Science"
                  value={profile.major || ""}
                  onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                />
              </div>
              <div>
                <label className="label">GPA range</label>
                <select
                  className="input"
                  value={profile.gpa_range || ""}
                  onChange={(e) => setProfile({ ...profile, gpa_range: e.target.value })}
                >
                  <option value="">Select…</option>
                  {["Below 3.0", "3.0–3.5", "3.5–3.8", "3.8+"].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Hours / week available</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  className="input"
                  placeholder="e.g. 10"
                  value={profile.hours_per_week || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, hours_per_week: Number(e.target.value) || undefined })
                  }
                />
              </div>
              <div>
                <label className="label">Earliest start date</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Fall 2026"
                  value={profile.start_date || ""}
                  onChange={(e) => setProfile({ ...profile, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Work preference</label>
                <select
                  className="input"
                  value={profile.remote_preference || "hybrid"}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      remote_preference: e.target.value as "remote" | "in-person" | "hybrid",
                    })
                  }
                >
                  <option value="remote">Remote</option>
                  <option value="in-person">In-person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <TagInput
              label="Skills (click a tag to remove)"
              value={profile.skills || []}
              onChange={(v) => setProfile({ ...profile, skills: v })}
            />
            <TagInput
              label="Research interests (click a tag to remove)"
              value={profile.interests || []}
              onChange={(v) => setProfile({ ...profile, interests: v })}
            />
            <TagInput
              label="Preferred research domains"
              value={profile.preferred_domains || []}
              onChange={(v) => setProfile({ ...profile, preferred_domains: v })}
            />

            <div>
              <label className="label">Short bio</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="A few sentences about yourself and your research goals…"
                value={profile.bio || ""}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="anon"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={profile.is_anonymous}
                onChange={(e) => setProfile({ ...profile, is_anonymous: e.target.checked })}
              />
              <label htmlFor="anon" className="text-sm text-slate-600">
                Browse anonymously (your name is hidden until a mutual match)
              </label>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "Saving…" : "Save and start discovering →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
