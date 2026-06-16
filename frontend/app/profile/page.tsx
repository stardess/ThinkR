"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { studentsApi } from "@/lib/api";
import { StudentProfile } from "@/lib/types";

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
      <div className="mb-2 flex flex-wrap gap-2">
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
        <button type="button" className="btn-secondary px-4 py-2" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
}

export default function ProfileEditPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<Partial<StudentProfile>>({});

  useEffect(() => {
    studentsApi
      .getMyProfile()
      .then((res) => setProfile(res.data))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      // Send only the editable fields the update schema accepts.
      const payload = {
        academic_year: profile.academic_year || null,
        major: profile.major || null,
        skills: profile.skills || [],
        interests: profile.interests || [],
        gpa_range: profile.gpa_range || null,
        hours_per_week: profile.hours_per_week ?? null,
        start_date: profile.start_date || null,
        remote_preference: profile.remote_preference || null,
        preferred_domains: profile.preferred_domains || [],
        prior_experience: profile.prior_experience || [],
        bio: profile.bio || null,
        is_anonymous: profile.is_anonymous ?? false,
      };
      const { data } = await studentsApi.updateMyProfile(payload);
      setProfile(data);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Failed to save profile. Please try again.";
      alert("Save error: " + msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-2xl">
        {loading ? (
          <p className="animate-pulse text-sm text-slate-400">Loading…</p>
        ) : (
          <form className="card space-y-6" onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <TagInput
              label="Prior research experience (boosts your match score)"
              value={profile.prior_experience || []}
              onChange={(v) => setProfile({ ...profile, prior_experience: v })}
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
                checked={profile.is_anonymous ?? false}
                onChange={(e) => setProfile({ ...profile, is_anonymous: e.target.checked })}
              />
              <label htmlFor="anon" className="text-sm text-slate-600">
                Browse anonymously (your name is hidden until a mutual match)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              {saved && <span className="text-sm font-medium text-match">✓ Saved</span>}
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
