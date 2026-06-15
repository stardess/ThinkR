"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { researchersApi } from "@/lib/api";

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

type Step = "profile" | "project";

export default function ResearcherOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    institution: "",
    department: "",
    lab_name: "",
    title: "",
    research_areas: [] as string[],
    bio: "",
  });

  const [project, setProject] = useState({
    title: "",
    description_plain: "",
    required_skills: [] as string[],
    preferred_skills: [] as string[],
    hours_per_week: "",
    start_date: "",
    duration: "",
    min_academic_year: "",
    remote_option: false,
  });

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await researchersApi.updateMyProfile(profile);
      setStep("project");
    } finally {
      setSaving(false);
    }
  }

  async function handleProjectCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await researchersApi.createProject({
        ...project,
        hours_per_week: project.hours_per_week ? Number(project.hours_per_week) : undefined,
      });
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-brand-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <div className={`h-2 flex-1 rounded-full ${step === "profile" ? "bg-brand-600" : "bg-brand-200"}`} />
          <div className={`h-2 flex-1 rounded-full ${step === "project" ? "bg-brand-600" : "bg-slate-200"}`} />
        </div>

        {step === "profile" && (
          <form className="card space-y-5" onSubmit={handleProfileSave}>
            <div>
              <h1 className="text-2xl font-bold text-brand-900 mb-1">Your researcher profile</h1>
              <p className="text-sm text-slate-500">
                Students will see this when they match with your projects.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Institution</label>
                <input
                  className="input"
                  placeholder="e.g. MIT"
                  value={profile.institution}
                  onChange={(e) => setProfile({ ...profile, institution: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  className="input"
                  placeholder="e.g. EECS"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Lab / Group name</label>
                <input
                  className="input"
                  placeholder="e.g. Human-Computer Interaction Lab"
                  value={profile.lab_name}
                  onChange={(e) => setProfile({ ...profile, lab_name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Academic title</label>
                <input
                  className="input"
                  placeholder="e.g. Associate Professor"
                  value={profile.title}
                  onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                />
              </div>
            </div>

            <TagInput
              label="Research areas"
              value={profile.research_areas}
              onChange={(v) => setProfile({ ...profile, research_areas: v })}
            />

            <div>
              <label className="label">Short bio</label>
              <textarea
                className="input min-h-[100px] resize-y"
                placeholder="Describe your lab and current research focus…"
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "Saving…" : "Next: Create a project →"}
            </button>
          </form>
        )}

        {step === "project" && (
          <form className="card space-y-5" onSubmit={handleProjectCreate}>
            <div>
              <h1 className="text-2xl font-bold text-brand-900 mb-1">Create your first project</h1>
              <p className="text-sm text-slate-500">
                Write in plain language — students are not academics yet.
              </p>
            </div>

            <div>
              <label className="label">Project title</label>
              <input
                className="input"
                placeholder="e.g. Building interpretable ML models for clinical decision support"
                value={project.title}
                onChange={(e) => setProject({ ...project, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Description (plain language)</label>
              <textarea
                className="input min-h-[140px] resize-y"
                placeholder="Describe what the student will actually do day-to-day. Avoid jargon — imagine explaining it to a curious sophomore…"
                value={project.description_plain}
                onChange={(e) => setProject({ ...project, description_plain: e.target.value })}
                required
              />
            </div>

            <TagInput
              label="Required skills"
              value={project.required_skills}
              onChange={(v) => setProject({ ...project, required_skills: v })}
            />
            <TagInput
              label="Preferred skills (nice to have)"
              value={project.preferred_skills}
              onChange={(v) => setProject({ ...project, preferred_skills: v })}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hours / week</label>
                <input
                  type="number"
                  min={1}
                  max={40}
                  className="input"
                  placeholder="e.g. 10"
                  value={project.hours_per_week}
                  onChange={(e) => setProject({ ...project, hours_per_week: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Start date</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Fall 2026"
                  value={project.start_date}
                  onChange={(e) => setProject({ ...project, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Duration</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. 1 semester, ongoing"
                  value={project.duration}
                  onChange={(e) => setProject({ ...project, duration: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Min. academic year</label>
                <select
                  className="input"
                  value={project.min_academic_year}
                  onChange={(e) => setProject({ ...project, min_academic_year: e.target.value })}
                >
                  <option value="">Any year</option>
                  {["Freshman", "Sophomore", "Junior", "Senior", "Masters", "PhD"].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={project.remote_option}
                onChange={(e) => setProject({ ...project, remote_option: e.target.checked })}
              />
              <span className="text-sm text-slate-600">Remote participation available</span>
            </label>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? "Creating…" : "Create project and go to dashboard →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
