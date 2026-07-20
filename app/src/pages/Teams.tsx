import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  X, Trophy, TrendingUp, Users, ChevronRight, Pencil, Trash2, Camera,
  AlertTriangle, Check, Plus
} from 'lucide-react'
import { useSiteImages, useSiteImage, useSiteText, LABEL_PREFIX, asset } from '@/hooks/useSiteImages'
import { saveSiteImageUrl } from '@/lib/siteImages'
import { useAuth } from '@/lib/AuthContext'
import {
  getPlayers, setPlayers, getTeams, setTeams,
  removePlayerFromClub,
  type Player
} from '@/lib/clubData'

// ─── Scroll Reveal Hook ───
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

// ─── Display Player type (bridges clubData.Player to display) ───
interface DisplayPlayer {
  id: string
  name: string
  number: number
  position: string
  height: string
  age: number
  since: number
  nationality: string
  image: string
  ppg: number
  rpg: number
  apg: number
  clubPlayer: Player
}

function toDisplayPlayer(p: Player): DisplayPlayer {
  return {
    id: p.id,
    name: p.name,
    number: p.jerseyNumber,
    position: p.position,
    height: p.height || "6'0\"",
    age: p.age || 25,
    since: p.since || 2021,
    nationality: p.gender === 'Male' ? 'IRL' : 'IRL',
    image: p.photoUrl ? asset(p.photoUrl) : '',
    ppg: p.ppg || 0,
    rpg: p.rpg || 0,
    apg: p.apg || 0,
    clubPlayer: p,
  }
}

// ─── Edit Modal ───
function EditPlayerModal({
  player,
  onSave,
  onClose,
  isNew = false,
}: {
  player: DisplayPlayer
  onSave: (id: string, updates: Partial<Player>, newPhoto?: string) => void
  onClose: () => void
  isNew?: boolean
}) {
  const [name, setName] = useState(player.name)
  const [position, setPosition] = useState(player.position)
  const [number, setNumber] = useState(player.number.toString())
  const [height, setHeight] = useState(player.height)
  const [age, setAge] = useState(player.age.toString())
  const [ppg, setPpg] = useState(player.ppg.toString())
  const [rpg, setRpg] = useState(player.rpg.toString())
  const [apg, setApg] = useState(player.apg.toString())
  const [photoPreview, setPhotoPreview] = useState(player.image)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const updates: Partial<Player> = {
      name,
      position,
      jerseyNumber: parseInt(number) || player.number,
      height,
      age: parseInt(age) || player.age,
      ppg: parseFloat(ppg) || 0,
      rpg: parseFloat(rpg) || 0,
      apg: parseFloat(apg) || 0,
    }
    const newPhoto = photoPreview !== player.image ? photoPreview : undefined
    onSave(player.id, updates, newPhoto)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="font-oswald font-bold text-xl text-white">{isNew ? 'Add Player' : 'Edit Player'}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Photo */}
        <div className="p-5 flex flex-col items-center gap-3">
          <div className="relative">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt={name}
                className="w-24 h-24 rounded-full object-cover border-2 border-electric-blue"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center border-2 border-slate-600">
                <Users className="w-10 h-10 text-slate-600" />
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-electric-blue rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-400 transition-colors shadow-lg">
              <Camera size={14} className="text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">Tap camera to change photo</p>
        </div>

        {/* Fields */}
        <div className="px-5 pb-5 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              >
                <option value="Guard">Guard</option>
                <option value="Forward">Forward</option>
                <option value="Center">Center</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Jersey #</label>
              <input
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Height</label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">PPG</label>
              <input
                type="number"
                step="0.1"
                value={ppg}
                onChange={(e) => setPpg(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">RPG</label>
              <input
                type="number"
                step="0.1"
                value={rpg}
                onChange={(e) => setRpg(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">APG</label>
              <input
                type="number"
                step="0.1"
                value={apg}
                onChange={(e) => setApg(e.target.value)}
                className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 border border-white/[0.06] text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 bg-electric-blue text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} /> {isNew ? 'Add Player' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirmation ───
function DeleteConfirmModal({
  playerName,
  onConfirm,
  onClose,
}: {
  playerName: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] rounded-2xl max-w-sm w-full p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <h2 className="font-oswald font-bold text-lg text-white">Remove Player</h2>
        </div>
        <p className="text-sm text-slate-300 mb-6">
          Are you sure you want to remove <span className="text-white font-semibold">{playerName}</span>? This will remove them from the team roster and delete their player record.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 border border-white/[0.06] text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 hover:bg-red-600 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Coach Edit Modal ───
function CoachEditModal({
  name,
  role,
  bio,
  onSave,
  onClose,
}: {
  name: string
  role: string
  bio: string
  onSave: (name: string, role: string, bio: string) => void
  onClose: () => void
}) {
  const [n, setN] = useState(name)
  const [r, setR] = useState(role)
  const [b, setB] = useState(bio)

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1E293B] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <h2 className="font-oswald font-bold text-xl text-white">Edit Coach</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              value={n}
              onChange={(e) => setN(e.target.value)}
              className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Role / Title</label>
            <input
              type="text"
              value={r}
              onChange={(e) => setR(e.target.value)}
              className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={b}
              onChange={(e) => setB(e.target.value)}
              rows={4}
              className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-electric-blue resize-y"
            />
          </div>
        </div>
        <div className="p-5 border-t border-white/[0.06] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white/5 border border-white/[0.06] text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(n.trim(), r.trim(), b.trim()); onClose() }}
            disabled={!n.trim()}
            className="flex-1 bg-electric-blue text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Check size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Player Card ───
function PlayerCard({
  player,
  index,
  isManager,
  onEdit,
  onRemove,
}: {
  player: DisplayPlayer
  index: number
  isManager: boolean
  onEdit: (p: DisplayPlayer) => void
  onRemove: (p: DisplayPlayer) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { ref, visible } = useScrollReveal()
  const { getUrl } = useSiteImages()

  const playerImageMap: Record<string, string> = {
    'Kevin Anyanwu': getUrl('playerKevin'),
    'Tiago Pereira': getUrl('playerTiago'),
    'Tara Nevin': getUrl('playerTara'),
    'Emily Smyth': getUrl('playerEmily'),
  }
  const img = playerImageMap[player.name] || player.image || ''

  return (
    <>
      <div
        ref={ref}
        className={`section-reveal ${visible ? 'visible' : ''}`}
        style={{ transitionDelay: `${index * 100}ms` }}
      >
        <div className="relative group bg-[#1E293B] rounded-xl overflow-hidden hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 ease-out">
          {/* Manager actions overlay */}
          {isManager && (
            <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(player) }}
                className="w-8 h-8 bg-electric-blue/90 rounded-lg flex items-center justify-center text-white hover:bg-electric-blue transition-colors shadow-lg"
                title="Edit player"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(player) }}
                className="w-8 h-8 bg-red-500/90 rounded-lg flex items-center justify-center text-white hover:bg-red-500 transition-colors shadow-lg"
                title="Remove player"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}

          <button
            onClick={() => setExpanded(true)}
            className="w-full text-left"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              {img ? (
                <img
                  src={img}
                  alt={player.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center">
                  <Users className="w-16 h-16 text-slate-600" />
                </div>
              )}
              <div className="absolute top-3 right-3 w-10 h-10 bg-electric-blue rounded-lg flex items-center justify-center">
                <span className="font-oswald font-bold text-lg text-white">{player.number}</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-inter font-semibold text-lg text-white">{player.name}</h3>
              <p className="font-inter text-sm text-electric-blue mt-1">{player.position}</p>
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="font-inter text-xs text-slate-400">
                  Height: {player.height}
                </span>
                <span className="font-inter text-xs text-slate-400">Age: {player.age}</span>
                <span className="font-inter text-xs text-slate-400">
                  Since: {player.since}
                </span>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                <div className="text-center">
                  <div className="font-oswald font-bold text-sm text-white">{player.ppg}</div>
                  <div className="font-inter text-[10px] text-slate-400 uppercase tracking-wider">PPG</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald font-bold text-sm text-white">{player.rpg}</div>
                  <div className="font-inter text-[10px] text-slate-400 uppercase tracking-wider">RPG</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald font-bold text-sm text-white">{player.apg}</div>
                  <div className="font-inter text-[10px] text-slate-400 uppercase tracking-wider">APG</div>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-[#1E293B] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/4] max-h-[320px] overflow-hidden">
              {img ? (
                <img
                  src={img}
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center">
                  <Users className="w-20 h-20 text-slate-600" />
                </div>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X size={20} />
              </button>
              {isManager && (
                <div className="absolute top-4 left-4 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); onEdit(player) }}
                    className="w-10 h-10 bg-electric-blue rounded-full flex items-center justify-center text-white hover:bg-blue-400 transition-colors shadow-lg"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpanded(false); onRemove(player) }}
                    className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0A1628] to-transparent p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="font-oswald font-bold text-3xl text-white">{player.name}</h2>
                    <p className="font-inter text-electric-blue mt-1">{player.position} · #{player.number}</p>
                  </div>
                  <div className="w-14 h-14 bg-electric-blue rounded-xl flex items-center justify-center">
                    <span className="font-oswald font-bold text-2xl text-white">{player.number}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A1628] rounded-lg p-3">
                  <div className="font-inter text-xs text-slate-400 uppercase tracking-wider">Height</div>
                  <div className="font-oswald font-bold text-lg text-white mt-1">{player.height}</div>
                </div>
                <div className="bg-[#0A1628] rounded-lg p-3">
                  <div className="font-inter text-xs text-slate-400 uppercase tracking-wider">Age</div>
                  <div className="font-oswald font-bold text-lg text-white mt-1">{player.age}</div>
                </div>
                <div className="bg-[#0A1628] rounded-lg p-3">
                  <div className="font-inter text-xs text-slate-400 uppercase tracking-wider">Nationality</div>
                  <div className="font-oswald font-bold text-lg text-white mt-1">{player.nationality}</div>
                </div>
                <div className="bg-[#0A1628] rounded-lg p-3">
                  <div className="font-inter text-xs text-slate-400 uppercase tracking-wider">Member Since</div>
                  <div className="font-oswald font-bold text-lg text-white mt-1">{player.since}</div>
                </div>
              </div>
              <div className="bg-[#0A1628] rounded-lg p-4">
                <div className="font-inter text-xs text-slate-400 uppercase tracking-wider mb-2">Season Stats</div>
                <div className="flex justify-around">
                  <div className="text-center">
                    <div className="font-oswald font-bold text-2xl text-electric-blue">{player.ppg}</div>
                    <div className="font-inter text-xs text-slate-400">PPG</div>
                  </div>
                  <div className="text-center">
                    <div className="font-oswald font-bold text-2xl text-electric-blue">{player.rpg}</div>
                    <div className="font-inter text-xs text-slate-400">RPG</div>
                  </div>
                  <div className="text-center">
                    <div className="font-oswald font-bold text-2xl text-electric-blue">{player.apg}</div>
                    <div className="font-inter text-xs text-slate-400">APG</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Team Section ───
function TeamSection({
  teamId,
  teamName,
  coachName,
  coachRole,
  coachBio,
  coachKeys,
  genderLabel,
  isManager,
  onEdit,
  onRemove,
  onAdd,
}: {
  teamId: string
  teamName: string
  coachName: string
  coachRole: string
  coachBio: string
  coachKeys: { name: string; role: string; bio: string }
  genderLabel: string
  isManager: boolean
  onEdit: (p: DisplayPlayer) => void
  onRemove: (p: DisplayPlayer) => void
  onAdd: (teamId: string) => void
}) {
  const headerReveal = useScrollReveal()
  const coachReveal = useScrollReveal()
  const statsReveal = useScrollReveal()
  const coachImg = useSiteImage('coachRob')
  const [editingCoach, setEditingCoach] = useState(false)

  // Persist coach fields to the shared label store (manager-only via RLS).
  const saveCoach = (name: string, role: string, bio: string) => {
    void saveSiteImageUrl(`${LABEL_PREFIX}${coachKeys.name}`, name)
    void saveSiteImageUrl(`${LABEL_PREFIX}${coachKeys.role}`, role)
    void saveSiteImageUrl(`${LABEL_PREFIX}${coachKeys.bio}`, bio)
  }

  // Live player data
  const [players, setPlayersState] = useState<DisplayPlayer[]>([])
  const [teamStats, setTeamStats] = useState({ ppg: 0, rpg: 0, apg: 0, fg: '0%' })
  const [record, setRecord] = useState('W 0 — L 0')

  const loadData = useCallback(() => {
    const allPlayers = getPlayers()
    const teamPlayers = allPlayers
      .filter((p) => p.teamIds.includes(teamId))
      .map(toDisplayPlayer)
    setPlayersState(teamPlayers)

    const team = getTeams().find((t) => t.id === teamId)
    if (team) setRecord(`W ${team.wins} — L ${team.losses}`)

    // Compute team stats from player stats
    if (teamPlayers.length > 0) {
      const avgPpg = teamPlayers.reduce((s, p) => s + p.ppg, 0) / teamPlayers.length
      const avgRpg = teamPlayers.reduce((s, p) => s + p.rpg, 0) / teamPlayers.length
      const avgApg = teamPlayers.reduce((s, p) => s + p.apg, 0) / teamPlayers.length
      setTeamStats({
        ppg: Math.round(avgPpg * 10) / 10,
        rpg: Math.round(avgRpg * 10) / 10,
        apg: Math.round(avgApg * 10) / 10,
        fg: '46.2%',
      })
    }
  }, [teamId])

  useEffect(() => {
    loadData()
    const handler = (e: StorageEvent) => {
      if (e.key === 'dlbc_players' || e.key === 'dlbc_teams') loadData()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [loadData])

  return (
    <section id={genderLabel.toLowerCase().replace("'", '').replace(' ', '-')} className="bg-deep-navy py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
        {/* Team Header */}
        <div
          ref={headerReveal.ref}
          className={`section-reveal ${headerReveal.visible ? 'visible' : ''} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}
        >
          <div>
            <h2 className="font-oswald font-bold text-2xl md:text-3xl lg:text-4xl text-white tracking-tight">
              {teamName}
            </h2>
            <p className="font-inter text-base text-slate-400 mt-1">
              {genderLabel === "Men's" ? "Men's" : "Women's"} Senior Team · Domino's Division 1
            </p>
          </div>
          <div className="flex items-center gap-2 bg-amber-400/10 px-4 py-2 rounded-lg self-start md:self-center">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-oswald font-bold text-xl text-amber-400">{record}</span>
          </div>
        </div>

        {/* Coach Card */}
        <div
          ref={coachReveal.ref}
          className={`section-reveal ${coachReveal.visible ? 'visible' : ''} relative mt-8 bg-[#1E293B] rounded-xl p-6 flex flex-col sm:flex-row items-start gap-6`}
          style={{ transitionDelay: '100ms' }}
        >
          {isManager && (
            <button
              onClick={() => setEditingCoach(true)}
              className="absolute top-4 right-4 w-9 h-9 bg-electric-blue/90 rounded-lg flex items-center justify-center text-white hover:bg-electric-blue transition-colors shadow-lg"
              title="Edit coach"
            >
              <Pencil size={15} />
            </button>
          )}
          <img
            src={coachImg}
            alt={coachName}
            className="w-20 h-20 rounded-full object-cover shrink-0"
          />
          <div>
            <h3 className="font-inter font-semibold text-xl text-white">{coachName}</h3>
            <p className="font-inter text-sm text-slate-400 mt-1">{coachRole}</p>
            <p className="font-inter text-sm text-slate-300 mt-3 max-w-lg leading-relaxed">
              {coachBio}
            </p>
          </div>
        </div>

        {editingCoach && (
          <CoachEditModal
            name={coachName}
            role={coachRole}
            bio={coachBio}
            onSave={saveCoach}
            onClose={() => setEditingCoach(false)}
          />
        )}

        {/* Player Roster */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-electric-blue" />
              Roster
            </h3>
            <div className="flex items-center gap-4">
              <span className="font-inter text-sm text-slate-400">
                {players.length} Players
              </span>
              {isManager && (
                <button
                  onClick={() => onAdd(teamId)}
                  className="flex items-center gap-1.5 bg-electric-blue text-white font-inter font-semibold text-sm rounded-lg px-4 py-2 hover:bg-blue-400 transition-colors"
                >
                  <Plus size={16} /> Add Player
                </button>
              )}
            </div>
          </div>
          {players.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-inter text-sm">No players assigned to this team.</p>
              {isManager && (
                <button
                  onClick={() => onAdd(teamId)}
                  className="mt-4 inline-flex items-center gap-1.5 bg-electric-blue text-white font-inter font-semibold text-sm rounded-lg px-4 py-2 hover:bg-blue-400 transition-colors"
                >
                  <Plus size={16} /> Add Player
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {players.map((player, i) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  index={i}
                  isManager={isManager}
                  onEdit={onEdit}
                  onRemove={onRemove}
                />
              ))}
            </div>
          )}
        </div>

        {/* Team Stats */}
        <div
          ref={statsReveal.ref}
          className={`section-reveal ${statsReveal.visible ? 'visible' : ''} mt-12 grid grid-cols-2 md:grid-cols-4 gap-4`}
          style={{ transitionDelay: '100ms' }}
        >
          {[
            { label: 'Points Per Game', value: teamStats.ppg, icon: TrendingUp },
            { label: 'Rebounds Per Game', value: teamStats.rpg, icon: TrendingUp },
            { label: 'Assists Per Game', value: teamStats.apg, icon: TrendingUp },
            { label: 'Field Goal %', value: teamStats.fg, icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#1E293B] rounded-xl p-5 text-center">
              <div className="font-oswald font-bold text-2xl md:text-3xl text-electric-blue">
                {stat.value}
              </div>
              <div className="font-inter text-xs text-slate-400 uppercase tracking-wider mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Main Page ───
export default function Teams() {
  const [activeTab, setActiveTab] = useState<'mens' | 'womens'>('mens')
  // Manager status comes straight from the authenticated Supabase session role,
  // so edit controls appear only for a real manager and hide instantly on logout.
  const { role } = useAuth()
  const isManager = role === 'manager'
  // Coach text is shared across all visitors via the label store (see useSiteText).
  const coachMenName = useSiteText('coachRob', 'Rob White')
  const coachMenRole = useSiteText('coachMenRole', "Head Coach · Men's Team")
  const coachMenBio = useSiteText(
    'coachMenBio',
    'Rob brings over 15 years of coaching experience to Dublin Lions, previously coaching at collegiate level in the US before returning to Ireland.'
  )
  const coachWomenName = useSiteText('coachWomenName', 'Haris Sikorskis')
  const coachWomenRole = useSiteText('coachWomenRole', "Head Coach · Women's Team")
  const coachWomenBio = useSiteText(
    'coachWomenBio',
    "Haris is a former Lithuanian professional player who has brought European tactical discipline to the Dublin Lions women's programme since 2021."
  )

  // Edit / delete / add state
  const [editPlayer, setEditPlayer] = useState<DisplayPlayer | null>(null)
  const [deletePlayer, setDeletePlayer] = useState<DisplayPlayer | null>(null)
  const [addTeamId, setAddTeamId] = useState<string | null>(null)

  const scrollToSection = useCallback((tab: 'mens' | 'womens') => {
    setActiveTab(tab)
    const id = tab === 'mens' ? 'mens-team' : 'womens-team'
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const heroReveal = useScrollReveal()

  // Save handler
  const handleSavePlayer = (id: string, updates: Partial<Player>, newPhoto?: string) => {
    const allPlayers = getPlayers()
    const updated = allPlayers.map((p) => {
      if (p.id !== id) return p
      const merged = { ...p, ...updates }
      if (newPhoto !== undefined) {
        merged.photoUrl = newPhoto
      }
      return merged
    })
    setPlayers(updated)
  }

  // Add handler — creates a new player and assigns them to the given team.
  const handleAddPlayer = (_id: string, updates: Partial<Player>, newPhoto?: string) => {
    if (!addTeamId) return
    const newId = `p-${Date.now()}`
    const newPlayer: Player = {
      id: newId,
      name: updates.name || 'New Player',
      email: '',
      phone: '',
      dob: '',
      gender: addTeamId === 'women-senior-d1' ? 'Female' : 'Male',
      teamIds: [addTeamId],
      position: updates.position || 'Guard',
      jerseyNumber: updates.jerseyNumber ?? 0,
      status: 'Pending',
      paymentPlan: 'None',
      amount: 0,
      lastPaymentDate: '',
      registrationDate: new Date().toISOString().split('T')[0],
      registeredWithBI: false,
      photoUrl: newPhoto,
      ppg: updates.ppg ?? 0,
      rpg: updates.rpg ?? 0,
      apg: updates.apg ?? 0,
      height: updates.height,
      age: updates.age,
      since: new Date().getFullYear(),
    }
    setPlayers([...getPlayers(), newPlayer])

    // Add the new player to the team's roster list too.
    const allTeams = getTeams()
    setTeams(allTeams.map((t) => (t.id === addTeamId ? { ...t, players: [...t.players, newId] } : t)))
  }

  // A blank template used to open the modal in "add" mode.
  const blankPlayer: DisplayPlayer = {
    id: '', name: '', number: 0, position: 'Guard', height: "6'0\"", age: 21,
    since: new Date().getFullYear(), nationality: 'IRL', image: '',
    ppg: 0, rpg: 0, apg: 0,
    clubPlayer: {
      id: '', name: '', email: '', phone: '', dob: '', gender: 'Male',
      teamIds: [], position: 'Guard', jerseyNumber: 0, status: 'Pending',
      paymentPlan: 'None', amount: 0, lastPaymentDate: '', registrationDate: '',
      registeredWithBI: false,
    },
  }

  // Remove handler
  const handleRemovePlayer = (id: string) => {
    removePlayerFromClub(id)
  }

  return (
    <div className="bg-deep-navy min-h-[100dvh]">
      {/* Hero */}
      <section className="relative h-64 md:h-80 bg-deep-navy border-b border-white/[0.06] flex items-center justify-center">
        <div
          ref={heroReveal.ref}
          className={`section-reveal ${heroReveal.visible ? 'visible' : ''} text-center px-4`}
        >
          <nav className="font-inter text-sm text-slate-400 mb-4">
            <Link to="/" className="hover:text-electric-blue transition-colors">Home</Link>
            <ChevronRight className="inline w-4 h-4 mx-1" />
            <span className="text-slate-300">Teams</span>
          </nav>
          <h1 className="font-oswald font-bold text-4xl md:text-5xl lg:text-6xl text-white tracking-tight">
            The Pride
          </h1>
          <p className="font-inter text-base text-slate-300 max-w-xl mx-auto mt-4">
            Meet the players and coaches representing Dublin in Domino's Division 1
          </p>
          <div className="flex items-center justify-center gap-1 mt-8">
            <button
              onClick={() => scrollToSection('mens')}
              className={`px-6 py-3 font-inter font-medium text-sm rounded-lg transition-all duration-200 ${
                activeTab === 'mens'
                  ? 'text-white bg-white/5 border-b-2 border-electric-blue'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Men's Team
            </button>
            <button
              onClick={() => scrollToSection('womens')}
              className={`px-6 py-3 font-inter font-medium text-sm rounded-lg transition-all duration-200 ${
                activeTab === 'womens'
                  ? 'text-white bg-white/5 border-b-2 border-electric-blue'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Women's Team
            </button>
          </div>
        </div>
      </section>

      {/* Men's Team */}
      <div id="mens-team">
        <TeamSection
          teamId="men-senior-d1"
          teamName="JOELS DUBLIN LIONS"
          coachName={coachMenName}
          coachRole={coachMenRole}
          coachBio={coachMenBio}
          coachKeys={{ name: 'coachRob', role: 'coachMenRole', bio: 'coachMenBio' }}
          genderLabel="Men's"
          isManager={isManager}
          onEdit={setEditPlayer}
          onRemove={setDeletePlayer}
          onAdd={setAddTeamId}
        />
      </div>

      {/* Transition strip */}
      <div className="h-1 bg-white/[0.06]" />

      {/* Women's Team */}
      <div id="womens-team">
        <TeamSection
          teamId="women-senior-d1"
          teamName="ABBEY SEALS DUBLIN LIONS"
          coachName={coachWomenName}
          coachRole={coachWomenRole}
          coachBio={coachWomenBio}
          coachKeys={{ name: 'coachWomenName', role: 'coachWomenRole', bio: 'coachWomenBio' }}
          genderLabel="Women's"
          isManager={isManager}
          onEdit={setEditPlayer}
          onRemove={setDeletePlayer}
          onAdd={setAddTeamId}
        />
      </div>

      {/* Join CTA */}
      <section className="cta-gradient py-20 md:py-24">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h2 className="font-oswald font-bold text-3xl md:text-4xl text-white">
            Think You've Got What It Takes?
          </h2>
          <p className="font-inter text-lg text-slate-300 max-w-2xl mx-auto mt-6 leading-relaxed">
            We're always looking for passionate players to join the Pride. Whether you're an
            experienced Division 1 player or an ambitious amateur ready to step up — get in
            touch and come to a training session.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Link
              to="/contact"
              className="bg-electric-blue text-white font-inter font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded hover:bg-blue-400 hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Apply for Trials
            </Link>
            <Link
              to="/contact"
              className="border border-white/30 text-white font-inter font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded hover:border-white/50 hover:bg-white/10 transition-all duration-200"
            >
              Contact Coaches
            </Link>
          </div>
        </div>
      </section>

      {/* Modals */}
      {editPlayer && (
        <EditPlayerModal
          player={editPlayer}
          onSave={handleSavePlayer}
          onClose={() => setEditPlayer(null)}
        />
      )}
      {addTeamId && (
        <EditPlayerModal
          isNew
          player={blankPlayer}
          onSave={handleAddPlayer}
          onClose={() => setAddTeamId(null)}
        />
      )}
      {deletePlayer && (
        <DeleteConfirmModal
          playerName={deletePlayer.name}
          onConfirm={() => {
            handleRemovePlayer(deletePlayer.id)
            setDeletePlayer(null)
          }}
          onClose={() => setDeletePlayer(null)}
        />
      )}
    </div>
  )
}
