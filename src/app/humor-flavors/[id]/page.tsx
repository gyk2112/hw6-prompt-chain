'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// Columns to skip in dynamic forms
const META_COLS = ['id', 'humor_flavor_id', 'created_at', 'updated_at', 'created_datetime_utc', 'updated_datetime_utc', 'modified_datetime_utc', 'created_by_user_id', 'modified_by_user_id']
const LONG_COLS = ['llm_system_prompt', 'llm_user_prompt', 'prompt', 'description', 'content', 'instructions', 'template']
const ORDER_COL = 'order_by'

interface Flavor {
  id: string
  name: string
  description: string | null
  [key: string]: any
}

interface Step {
  id: string
  humor_flavor_id: string
  [key: string]: any
}

export default function FlavorDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const flavorId = params.id as string

  // Flavor state
  const [flavor, setFlavor] = useState<Flavor | null>(null)
  const [editingFlavor, setEditingFlavor] = useState(false)
  const [flavorForm, setFlavorForm] = useState({ name: '', description: '' })

  // Steps state
  const [steps, setSteps] = useState<Step[]>([])
  const [stepCols, setStepCols] = useState<string[]>([])
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editStepForm, setEditStepForm] = useState<Record<string, any>>({})
  const [showCreateStep, setShowCreateStep] = useState(false)
  const [createStepForm, setCreateStepForm] = useState<Record<string, any>>({})

  // Test runner state
  const [testImageUrl, setTestImageUrl] = useState('')
  const [testImageId, setTestImageId] = useState<string | null>(null)
  const [testImages, setTestImages] = useState<any[]>([])
  const [testFile, setTestFile] = useState<File | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [testError, setTestError] = useState<string | null>(null)

  // General state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const fetchFlavor = useCallback(async () => {
    const { data, error } = await supabase
      .from('humor_flavors')
      .select('*')
      .eq('id', flavorId)
      .single()
    if (error) setError(error.message)
    else {
      setFlavor(data)
      setFlavorForm({ name: data.description ?? '', description: data.slug ?? '' })
    }
  }, [flavorId])

  const fetchSteps = useCallback(async () => {
    const { data, error } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', flavorId)
    if (error) { setError(error.message); return }
    const rows = data ?? []

    if (rows.length > 0) {
      const allCols = Object.keys(rows[0])
      setStepCols(allCols)
      const sorted = [...rows].sort((a, b) => (a[ORDER_COL] ?? 0) - (b[ORDER_COL] ?? 0))
      setSteps(sorted)

      // Build blank create form
      const editableCols = allCols.filter((c) => !META_COLS.includes(c) && c !== ORDER_COL)
      const blank: Record<string, any> = {}
      editableCols.forEach((c) => {
        blank[c] = typeof rows[0][c] === 'boolean' ? false : ''
      })
      setCreateStepForm(blank)
    } else {
      setSteps([])
      // No rows yet — seed cols and defaults from known schema
      setStepCols(['llm_input_type_id', 'llm_output_type_id', 'llm_model_id', 'humor_flavor_step_type_id', 'llm_temperature', 'llm_system_prompt', 'llm_user_prompt', 'description'])
      setCreateStepForm({
        llm_input_type_id: 1,
        llm_output_type_id: 1,
        llm_model_id: 6,
        humor_flavor_step_type_id: 3,
        llm_temperature: 0.7,
        llm_system_prompt: '',
        llm_user_prompt: '',
        description: '',
        [ORDER_COL]: 1,
      })
    }
  }, [flavorId])

  const fetchTestImages = useCallback(async () => {
    const { data } = await supabase
      .from('images')
      .select('id, url')
      .limit(6)
    setTestImages(data ?? [])
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchFlavor(), fetchSteps(), fetchTestImages()])
      setLoading(false)
    }
    init()
  }, [fetchFlavor, fetchSteps, fetchTestImages])

  // Flavor CRUD
  const saveFlavor = async () => {
    if (!flavor) return
    setSaving(true)
    const { error } = await supabase
      .from('humor_flavors')
      .update({ description: flavorForm.name.trim(), slug: flavorForm.description.trim() || null, modified_by_user_id: userId })
      .eq('id', flavorId)
    if (error) setError(error.message)
    else { setEditingFlavor(false); fetchFlavor() }
    setSaving(false)
  }

  // Step CRUD
  const editableCols = stepCols.filter((c) => !META_COLS.includes(c) && c !== ORDER_COL)

  const startEditStep = (step: Step) => {
    setEditingStepId(step.id)
    const form: Record<string, any> = {}
    editableCols.forEach((c) => { form[c] = step[c] ?? '' })
    setEditStepForm(form)
  }

  const saveStep = async () => {
    if (!editingStepId) return
    setSaving(true)
    const { error } = await supabase
      .from('humor_flavor_steps')
      .update({ ...editStepForm, modified_by_user_id: userId })
      .eq('id', editingStepId)
    if (error) setError(error.message)
    else { setEditingStepId(null); fetchSteps() }
    setSaving(false)
  }

  const createStep = async () => {
    setSaving(true)
    const nextOrder = steps.length > 0
      ? Math.max(...steps.map((s) => s[ORDER_COL] ?? 0)) + 1
      : 1
    const payload: Record<string, any> = {
      humor_flavor_id: flavorId,
      [ORDER_COL]: nextOrder,
      created_by_user_id: userId,
      modified_by_user_id: userId,
      ...createStepForm,
    }
    // Remove empty strings
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') delete payload[k]
    })
    const { error } = await supabase.from('humor_flavor_steps').insert(payload)
    if (error) setError(error.message)
    else {
      setShowCreateStep(false)
      const blank: Record<string, any> = {}
      editableCols.forEach((c) => { blank[c] = '' })
      setCreateStepForm(blank)
      fetchSteps()
    }
    setSaving(false)
  }

  const deleteStep = async (id: string) => {
    if (!confirm('Delete this step?')) return
    const { error } = await supabase.from('humor_flavor_steps').delete().eq('id', id)
    if (error) setError(error.message)
    else fetchSteps()
  }

  const moveStep = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= steps.length) return

    const stepA = steps[index]
    const stepB = steps[targetIndex]
    const orderA = stepA[ORDER_COL]
    const orderB = stepB[ORDER_COL]

    setSaving(true)
    const [r1, r2] = await Promise.all([
      supabase.from('humor_flavor_steps').update({ [ORDER_COL]: orderB, modified_by_user_id: userId }).eq('id', stepA.id),
      supabase.from('humor_flavor_steps').update({ [ORDER_COL]: orderA, modified_by_user_id: userId }).eq('id', stepB.id),
    ])
    if (r1.error) setError(r1.error.message)
    else if (r2.error) setError(r2.error.message)
    else fetchSteps()
    setSaving(false)
  }

  // Test runner
  const runTest = async () => {
    if (!testFile && !testImageUrl) {
      setTestError('Please select or upload a test image.')
      return
    }
    setTestLoading(true)
    setTestResult(null)
    setTestError(null)

    try {
      let body: Record<string, any> = { humorFlavorId: flavorId }

      if (testFile) {
        // Convert file to base64 data URL for server route
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(testFile)
        })
        body.imageFile = dataUrl
      } else {
        body.imageUrl = testImageUrl
      }

      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error || JSON.stringify(json) || `HTTP ${res.status}`)
      }
      setTestResult(json)
    } catch (err: any) {
      setTestError(err.message || 'Request failed')
    }
    setTestLoading(false)
  }

  // Shared styles
  const inputCls = 'w-full bg-transparent border border-[#ddd] dark:border-[#333] text-[#0a0a0a] dark:text-white text-xs px-3 py-2 focus:outline-none focus:border-[#555] dark:focus:border-[#666] placeholder-[#ccc] dark:placeholder-[#444]'
  const btnPrimary = 'text-[10px] tracking-widest uppercase border border-[#0a0a0a] dark:border-white px-3 py-1.5 text-[#0a0a0a] dark:text-white hover:bg-[#0a0a0a] dark:hover:bg-white hover:text-white dark:hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed'
  const btnSecondary = 'text-[10px] tracking-widest uppercase text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white px-3 py-1.5 transition-colors'

  const renderStepField = (col: string, value: any, onChange: (v: any) => void) => {
    if (typeof value === 'boolean') {
      return (
        <label key={col} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-black dark:accent-white"
          />
          <span className="text-[10px] text-[#888] dark:text-[#555] tracking-widest uppercase">{col}</span>
        </label>
      )
    }
    if (LONG_COLS.includes(col)) {
      return (
        <div key={col}>
          <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
            {col.replace(/_/g, ' ')}
          </label>
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            className={`${inputCls} resize-y min-h-[100px]`}
          />
        </div>
      )
    }
    return (
      <div key={col}>
        <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
          {col.replace(/_/g, ' ')}
        </label>
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-widest uppercase pt-8">
        Loading...
      </div>
    )
  }

  if (!flavor) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-500">Flavor not found.</p>
        <Link href="/humor-flavors" className={btnSecondary}>← Back</Link>
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] text-[#bbb] dark:text-[#444] tracking-widest uppercase">
        <Link href="/humor-flavors" className="hover:text-[#0a0a0a] dark:hover:text-white transition-colors">
          Humor Flavors
        </Link>
        <span>/</span>
        <span className="text-[#0a0a0a] dark:text-white">{flavor.description ?? flavor.slug ?? flavor.id}</span>
      </div>

      {error && (
        <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-[9px] text-red-400 mt-1 hover:text-red-600">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Flavor Info ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-[#0a0a0a] dark:text-white tracking-tight">{flavor.description ?? flavor.slug ?? flavor.id}</h1>
          {!editingFlavor && (
            <button
              onClick={() => setEditingFlavor(true)}
              className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white tracking-widest uppercase transition-colors"
            >
              Edit
            </button>
          )}
        </div>

        {editingFlavor ? (
          <div className="border border-[#e0e0e0] dark:border-[#2a2a2a] p-5 space-y-3 bg-[#fafafa] dark:bg-[#0f0f0f]">
            <div>
              <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">Name</label>
              <input
                value={flavorForm.name}
                onChange={(e) => setFlavorForm({ ...flavorForm, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">Slug</label>
              <textarea
                value={flavorForm.description}
                onChange={(e) => setFlavorForm({ ...flavorForm, description: e.target.value })}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex gap-2">
              <button onClick={saveFlavor} disabled={saving} className={btnPrimary}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingFlavor(false)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        ) : (
          flavor.slug && (
            <p className="text-sm text-[#777] dark:text-[#666]">{flavor.slug}</p>
          )
        )}
      </section>

      {/* ── Steps ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase mb-0.5">
              Prompt Chain
            </div>
            <h2 className="text-lg text-[#0a0a0a] dark:text-white tracking-tight">Steps</h2>
            <p className="text-[10px] text-[#aaa] dark:text-[#555] mt-0.5">{steps.length} steps</p>
          </div>
          <button
            onClick={() => setShowCreateStep(!showCreateStep)}
            className="text-[10px] tracking-widest uppercase border border-[#ddd] dark:border-[#333] hover:border-[#0a0a0a] dark:hover:border-white px-3 py-1.5 text-[#666] dark:text-[#aaa] hover:text-[#0a0a0a] dark:hover:text-white transition-all"
          >
            {showCreateStep ? 'Cancel' : '+ Add Step'}
          </button>
        </div>

        {showCreateStep && (
          <div className="border border-[#e0e0e0] dark:border-[#2a2a2a] p-5 space-y-3 bg-[#fafafa] dark:bg-[#0f0f0f]">
            <div className="text-[10px] text-[#aaa] dark:text-[#444] tracking-[0.3em] uppercase">
              New Step (will be added as step {steps.length + 1})
            </div>
            {editableCols.map((col) =>
              renderStepField(col, createStepForm[col], (v) =>
                setCreateStepForm({ ...createStepForm, [col]: v })
              )
            )}
            <button onClick={createStep} disabled={saving} className={btnPrimary}>
              {saving ? 'Adding...' : 'Add Step'}
            </button>
          </div>
        )}

        {steps.length === 0 ? (
          <p className="text-xs text-[#aaa] dark:text-[#444]">No steps yet. Add the first step above.</p>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="border border-[#ececec] dark:border-[#1a1a1a] bg-[#fafafa] dark:bg-[#0f0f0f]"
              >
                {/* Step header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#ececec] dark:border-[#1a1a1a]">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#bbb] dark:text-[#444] tabular-nums w-5">
                      {index + 1}
                    </span>
                    <span className="text-[10px] text-[#aaa] dark:text-[#555] tracking-widest uppercase">
                      Step {step[ORDER_COL] ?? index + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Reorder buttons */}
                    <button
                      onClick={() => moveStep(index, 'up')}
                      disabled={index === 0 || saving}
                      className="text-[10px] text-[#bbb] dark:text-[#444] hover:text-[#0a0a0a] dark:hover:text-white px-1.5 py-1 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveStep(index, 'down')}
                      disabled={index === steps.length - 1 || saving}
                      className="text-[10px] text-[#bbb] dark:text-[#444] hover:text-[#0a0a0a] dark:hover:text-white px-1.5 py-1 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <span className="text-[#ddd] dark:text-[#222] mx-1">|</span>
                    {editingStepId === step.id ? (
                      <>
                        <button onClick={saveStep} disabled={saving} className="text-[10px] tracking-widest uppercase text-[#0a0a0a] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 disabled:opacity-30 transition-colors">
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditingStepId(null)} className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white px-2 py-1 tracking-widest uppercase transition-colors">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditStep(step)}
                          className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white tracking-widest uppercase px-2 py-1 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteStep(step.id)}
                          className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-red-600 dark:hover:text-red-400 tracking-widest uppercase px-2 py-1 transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Step body */}
                <div className="p-4">
                  {editingStepId === step.id ? (
                    <div className="space-y-3">
                      {editableCols.map((col) =>
                        renderStepField(col, editStepForm[col], (v) =>
                          setEditStepForm({ ...editStepForm, [col]: v })
                        )
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editableCols.map((col) => {
                        const val = step[col]
                        if (val === null || val === undefined || val === '') return null
                        const isLong = LONG_COLS.includes(col)
                        return (
                          <div key={col}>
                            <div className="text-[9px] text-[#bbb] dark:text-[#444] tracking-widest uppercase mb-0.5">
                              {col.replace(/_/g, ' ')}
                            </div>
                            {isLong ? (
                              <pre className="text-xs text-[#555] dark:text-[#888] whitespace-pre-wrap break-words leading-relaxed bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#1a1a1a] p-3 max-h-48 overflow-y-auto">
                                {String(val)}
                              </pre>
                            ) : typeof val === 'boolean' ? (
                              <span className={`text-xs ${val ? 'text-green-600 dark:text-green-500' : 'text-[#aaa] dark:text-[#555]'}`}>
                                {val ? 'yes' : 'no'}
                              </span>
                            ) : (
                              <span className="text-xs text-[#0a0a0a] dark:text-[#ccc]">{String(val)}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Test Runner ─────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase mb-0.5">
            API Test
          </div>
          <h2 className="text-lg text-[#0a0a0a] dark:text-white tracking-tight">Test Flavor</h2>
          <p className="text-xs text-[#aaa] dark:text-[#555] mt-0.5">
            Generate captions by running this flavor against a test image
          </p>
        </div>

        <div className="border border-[#e0e0e0] dark:border-[#2a2a2a] p-5 space-y-4 bg-[#fafafa] dark:bg-[#0f0f0f]">
          {/* Upload a new image */}
          <div>
            <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-2">
              Upload Image
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setTestFile(f)
                if (f) {
                  setTestImageUrl(URL.createObjectURL(f))
                  setTestImageId(null)
                }
              }}
              className="text-xs text-[#555] dark:text-[#888] file:mr-3 file:border file:border-[#ddd] dark:file:border-[#333] file:bg-transparent file:text-[10px] file:text-[#666] dark:file:text-[#aaa] file:tracking-widest file:uppercase file:px-2 file:py-1 file:cursor-pointer hover:file:border-[#0a0a0a] dark:hover:file:border-white"
            />
          </div>

          {/* OR pick an existing image */}
          {testImages.length > 0 && (
            <div>
              <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-2">
                Or Pick Existing
              </label>
              <div className="flex gap-2 flex-wrap">
                {testImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => { setTestFile(null); setTestImageUrl(img.url); setTestImageId(img.id) }}
                    className={`border text-[10px] tracking-widest uppercase px-2 py-1 transition-all ${
                      testImageId === img.id
                        ? 'border-[#0a0a0a] dark:border-white text-[#0a0a0a] dark:text-white bg-[#0a0a0a]/5 dark:bg-white/10'
                        : 'border-[#ddd] dark:border-[#333] text-[#aaa] dark:text-[#555] hover:border-[#0a0a0a] dark:hover:border-white hover:text-[#0a0a0a] dark:hover:text-white'
                    }`}
                  >
                    Image {img.id.slice(0, 6)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {testImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={testImageUrl}
              alt="Test image preview"
              className="max-h-40 max-w-xs object-cover border border-[#e0e0e0] dark:border-[#2a2a2a] opacity-90"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}

          <button
            onClick={runTest}
            disabled={testLoading || (!testFile && !testImageUrl) || steps.length === 0}
            className={`${btnPrimary} px-6 py-2`}
          >
            {testLoading ? 'Generating...' : steps.length === 0 ? 'Add steps first' : 'Generate Captions'}
          </button>

          {/* Results */}
          {testError && (
            <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3">
              <p className="text-[10px] text-[#888] dark:text-[#555] tracking-widest uppercase mb-1">Error</p>
              <p className="text-xs text-red-600 dark:text-red-400">{testError}</p>
            </div>
          )}

          {testResult && (
            <div className="space-y-3">
              <div className="text-[10px] text-[#888] dark:text-[#555] tracking-[0.3em] uppercase">
                Result
              </div>
              {/* Show captions array if present */}
              {Array.isArray(testResult?.captions) && testResult.captions.length > 0 ? (
                <div className="space-y-2">
                  {testResult.captions.map((caption: string, i: number) => (
                    <div key={i} className="border border-[#e0e0e0] dark:border-[#1e1e1e] p-3 bg-white dark:bg-[#0a0a0a]">
                      <span className="text-[10px] text-[#bbb] dark:text-[#444] tabular-nums mr-2">{i + 1}.</span>
                      <span className="text-sm text-[#0a0a0a] dark:text-white">{caption}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-xs text-[#555] dark:text-[#888] whitespace-pre-wrap break-words bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#1a1a1a] p-4 max-h-80 overflow-y-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
