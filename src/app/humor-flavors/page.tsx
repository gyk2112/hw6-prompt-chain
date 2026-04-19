'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface HumorFlavor {
  id: string
  description: string | null
  slug: string | null
  created_datetime_utc: string
  [key: string]: any
}

export default function HumorFlavorsPage() {
  const supabase = createClient()
  const [flavors, setFlavors] = useState<HumorFlavor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [duplicateName, setDuplicateName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const fetchFlavors = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('humor_flavors')
      .select('*')
      .order('created_datetime_utc', { ascending: false })
    if (error) setError(error.message)
    setFlavors(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchFlavors() }, [])

  const createFlavor = async () => {
    if (!createForm.name.trim()) return
    setSaving(true)
    const payload: Record<string, string> = {
      description: createForm.name.trim(),
      created_by_user_id: userId!,
      modified_by_user_id: userId!,
    }
    if (createForm.description.trim()) payload.slug = createForm.description.trim()
    const { error } = await supabase.from('humor_flavors').insert(payload)
    if (error) setError(error.message)
    else {
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
      fetchFlavors()
    }
    setSaving(false)
  }

  const startEdit = (flavor: HumorFlavor) => {
    setEditingId(flavor.id)
    setEditForm({ name: flavor.description ?? '', description: flavor.slug ?? '' })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    const payload: Record<string, string | null> = {
      description: editForm.name.trim(),
      modified_by_user_id: userId,
    }
    payload.slug = editForm.description.trim() || null
    const { error } = await supabase.from('humor_flavors').update(payload).eq('id', editingId)
    if (error) setError(error.message)
    else { setEditingId(null); fetchFlavors() }
    setSaving(false)
  }

  const startDuplicate = (flavor: HumorFlavor) => {
    setDuplicatingId(flavor.id)
    setDuplicateName(`${flavor.description ?? flavor.slug ?? ''} (copy)`)
  }

  const duplicateFlavor = async (sourceFlavor: HumorFlavor) => {
    if (!duplicateName.trim()) return
    setSaving(true)
    // Create the new flavor record
    const { data: newFlavor, error: flavorErr } = await supabase
      .from('humor_flavors')
      .insert({
        description: duplicateName.trim(),
        slug: sourceFlavor.slug ?? null,
        created_by_user_id: userId!,
        modified_by_user_id: userId!,
      })
      .select()
      .single()
    if (flavorErr || !newFlavor) {
      setError(flavorErr?.message ?? 'Failed to create duplicate flavor')
      setSaving(false)
      return
    }

    // Fetch all steps from the source flavor
    const { data: sourceSteps, error: stepsErr } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', sourceFlavor.id)
      .order('order_by', { ascending: true })
    if (stepsErr) {
      setError(stepsErr.message)
      setSaving(false)
      return
    }

    // Insert copies of all steps under the new flavor, stripping meta cols
    const META = ['id', 'created_at', 'updated_at', 'created_datetime_utc', 'updated_datetime_utc', 'modified_datetime_utc', 'created_by_user_id', 'modified_by_user_id']
    if (sourceSteps && sourceSteps.length > 0) {
      const stepCopies = sourceSteps.map((step) => {
        const copy: Record<string, any> = {}
        Object.entries(step).forEach(([k, v]) => {
          if (!META.includes(k)) copy[k] = v
        })
        copy.humor_flavor_id = newFlavor.id
        copy.created_by_user_id = userId!
        copy.modified_by_user_id = userId!
        return copy
      })
      const { error: insertErr } = await supabase.from('humor_flavor_steps').insert(stepCopies)
      if (insertErr) {
        setError(insertErr.message)
        setSaving(false)
        return
      }
    }

    setDuplicatingId(null)
    setDuplicateName('')
    fetchFlavors()
    setSaving(false)
  }

  const deleteFlavor = async (id: string, name: string) => {
    if (!confirm(`Delete flavor "${name}"? This will also delete all its steps.`)) return
    const { error } = await supabase.from('humor_flavors').delete().eq('id', id)
    if (error) setError(error.message)
    else fetchFlavors()
  }

  const inputCls = 'w-full bg-transparent border border-[#ddd] dark:border-[#333] text-[#0a0a0a] dark:text-white text-xs px-3 py-2 focus:outline-none focus:border-[#555] dark:focus:border-[#666] placeholder-[#ccc] dark:placeholder-[#333]'
  const btnPrimary = 'text-[10px] tracking-widest uppercase border border-[#0a0a0a] dark:border-white px-4 py-2 text-[#0a0a0a] dark:text-white hover:bg-[#0a0a0a] dark:hover:bg-white hover:text-white dark:hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed'

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-[0.3em] uppercase mb-1">
            Prompt Chain
          </div>
          <h1 className="text-2xl text-[#0a0a0a] dark:text-white tracking-tight">Humor Flavors</h1>
          <p className="text-xs text-[#aaa] dark:text-[#555] mt-1">{flavors.length} flavors</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-[10px] tracking-widest uppercase border border-[#ddd] dark:border-[#333] hover:border-[#0a0a0a] dark:hover:border-white px-4 py-2 text-[#666] dark:text-[#aaa] hover:text-[#0a0a0a] dark:hover:text-white transition-all"
        >
          {showCreate ? 'Cancel' : '+ New Flavor'}
        </button>
      </div>

      {error && (
        <div className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-3">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {showCreate && (
        <div className="border border-[#e0e0e0] dark:border-[#2a2a2a] p-6 space-y-4 bg-[#fafafa] dark:bg-[#0f0f0f]">
          <div className="text-[10px] text-[#aaa] dark:text-[#444] tracking-[0.3em] uppercase">
            New Flavor
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
                Name *
              </label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g. dry-wit"
                className={inputCls}
                onKeyDown={(e) => e.key === 'Enter' && createFlavor()}
              />
            </div>
            <div>
              <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
                Slug
              </label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Describe this humor style..."
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </div>
            <button
              onClick={createFlavor}
              disabled={saving || !createForm.name.trim()}
              className={btnPrimary}
            >
              {saving ? 'Creating...' : 'Create Flavor'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-[10px] text-[#bbb] dark:text-[#444] tracking-widest uppercase">
          Loading...
        </div>
      ) : flavors.length === 0 ? (
        <p className="text-xs text-[#aaa] dark:text-[#444]">
          No humor flavors yet. Create one above.
        </p>
      ) : (
        <div className="space-y-px">
          {flavors.map((flavor) => (
            <div
              key={flavor.id}
              className="bg-[#fafafa] dark:bg-[#0f0f0f] border border-[#ececec] dark:border-[#1a1a1a] p-4"
            >
              {editingId === flavor.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
                      Name
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
                      Slug
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={saving} className={btnPrimary}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-[10px] tracking-widest uppercase text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white px-3 py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : duplicatingId === flavor.id ? (
                <div className="space-y-3">
                  <div className="text-[10px] text-[#aaa] dark:text-[#444] tracking-[0.3em] uppercase">
                    Duplicate &ldquo;{flavor.description ?? flavor.slug ?? flavor.id}&rdquo;
                  </div>
                  <div>
                    <label className="text-[10px] text-[#888] dark:text-[#444] tracking-widest uppercase block mb-1">
                      New Name *
                    </label>
                    <input
                      value={duplicateName}
                      onChange={(e) => setDuplicateName(e.target.value)}
                      placeholder="Enter a unique name..."
                      className={inputCls}
                      onKeyDown={(e) => e.key === 'Enter' && duplicateFlavor(flavor)}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => duplicateFlavor(flavor)}
                      disabled={saving || !duplicateName.trim()}
                      className={btnPrimary}
                    >
                      {saving ? 'Duplicating...' : 'Duplicate'}
                    </button>
                    <button
                      onClick={() => { setDuplicatingId(null); setDuplicateName('') }}
                      className="text-[10px] tracking-widest uppercase text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white px-3 py-1.5 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/humor-flavors/${flavor.id}`}
                      className="text-sm text-[#0a0a0a] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium block mb-0.5"
                    >
                      {flavor.description ?? flavor.slug ?? flavor.id}
                    </Link>
                    {flavor.slug && (
                      <p className="text-xs text-[#888] dark:text-[#666] line-clamp-2">
                        {flavor.slug}
                      </p>
                    )}
                    <div className="text-[9px] text-[#ccc] dark:text-[#444] mt-1.5">
                      {new Date(flavor.created_datetime_utc).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-3 flex-shrink-0 items-center">
                    <Link
                      href={`/humor-flavors/${flavor.id}`}
                      className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white tracking-widest uppercase transition-colors"
                    >
                      Steps →
                    </Link>
                    <button
                      onClick={() => startEdit(flavor)}
                      className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white tracking-widest uppercase transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => startDuplicate(flavor)}
                      className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-[#0a0a0a] dark:hover:text-white tracking-widest uppercase transition-colors"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => deleteFlavor(flavor.id, flavor.description ?? flavor.slug ?? String(flavor.id))}
                      className="text-[10px] text-[#aaa] dark:text-[#555] hover:text-red-600 dark:hover:text-red-400 tracking-widest uppercase transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
