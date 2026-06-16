import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import {
  BookOpen,
  Eye,
  Heart,
  History,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw, Skull,
  Square, Sun, Trash2,
  Trophy
} from 'lucide-react';
import { useEffect, useState } from 'react';
import './App.css';
import { db } from './firebase';
import { ROLE_DATA } from './roles';

// --- CONFIGURAZIONE CANTILENE E MANUALI ---
const GAME_MODES = ["Una Luna", "Una + Due Lune", "Darkest Night", "Cappuccetto Rosso"];

const MANUALS = {
  "Una Luna": "/Revised.pdf",
  "Una + Due Lune": "/Revised.pdf",
  "Darkest Night": "/Darkest Night.pdf",
  "Cappuccetto Rosso": "/Red Riding Hood.pdf"
};

const CANTILENA = {
  "Una Luna": {
    primaNotte: ["Veggente", "Mago", "Monaco", "Prete", "Lupi Mannari"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "Lupi Mannari", "Guaritore"]
  },
  "Una + Due Lune": {
    primaNotte: ["Veggente", "Mago", "Criminali", "Guardie", "Monaco", "Cacciatore di vampiri", "Prete", "Giulietta", "Angelo custode", "L'amuleto e la spada", "Lupi del branco", "Vampiro"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "L'amuleto e la spada", "Lupi Mannari", "Vampiro", "Guaritore"]
  },
  "Darkest Night": {
    primaNotte: ["Veggente", "Mago", "Inquisizione", "Criminali", "Guardie", "Monaco", "Bracconiere", "Cacciatore di vampiri", "Becchino", "Prete", "Giulietta", "Angelo custode", "L'amuleto e la spada", "Lupi del branco", "Lupo Solitario", "Vampiro", "Nosferatu", "Negromante", "Posseduto", "Guaritore"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "Strega", "L'amuleto e la spada", "Lupi Mannari", "Vampiro", "Nosferatu", "Guaritore", "Posseduto"]
  },
  "Cappuccetto Rosso": {
    primaNotte: ["Veggente", "Mago", "Criminali", "Guardie", "Monaco", "Cacciatore di vampiri", "Prete", "Giulietta", "Angelo custode", "L'amuleto e la spada", "Lupi del branco", "Vampiro"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "L'amuleto e la spada", "Lupi Mannari", "Vampiro", "Guaritore"]
  }
};

function App() {
  const [players, setPlayers] = useState([]);
  const [history, setHistory] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Modalità di Gioco Principale
  const [gameMode, setGameMode] = useState(null);

  const [masterName, setMasterName] = useState('');
  const [masterRole, setMasterRole] = useState('');

  // Modals States
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCantilenaModal, setShowCantilenaModal] = useState(false);
  const [showFabModal, setShowFabModal] = useState(false);
  const [cantilenaTab, setCantilenaTab] = useState('primaNotte');
  const [lastWinner, setLastWinner] = useState(null);

  // Timer States
  const [timerTime, setTimerTime] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const sortedRoles = Object.keys(ROLE_DATA).sort((a, b) => a.localeCompare(b));

  // Fetch Players & History
  useEffect(() => {
    const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Non li ordiniamo più per nome ma per ordine di inserimento (createdAt)
      setPlayers(playersData.sort((a, b) => a.createdAt - b.createdAt));
    });

    const unsubHistory = onSnapshot(collection(db, 'history'), (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(historyData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    return () => {
      unsubPlayers();
      unsubHistory();
    };
  }, []);

  const checkVictory = () => {
    if (!gameStarted) return null;
    const alivePlayers = players.filter(p => p.status === 'vivo');
    if (alivePlayers.length === 0) return null; 

    const isCreaturaOmbra = (p) => {
      const originalFaction = ROLE_DATA[p.role]?.fazione;
      const currentFaction = p.fazione;
      const isOriginallyOmbra = originalFaction === "Lupi del Branco" || originalFaction === "Vampiro" || ROLE_DATA[p.role]?.isWolf;
      const isCurrentlyOmbra = currentFaction === "Lupi del Branco" || currentFaction === "Vampiro";
      const isAmanteOmbra = currentFaction === "Amante" && isOriginallyOmbra;
      return isCurrentlyOmbra || isAmanteOmbra;
    };

    const aliveOmbra = alivePlayers.filter(isCreaturaOmbra).length;
    const aliveVampiri = alivePlayers.filter(p => p.fazione === "Vampiro").length;
    const aliveLupi = alivePlayers.filter(p => p.fazione === "Lupi del Branco" || ROLE_DATA[p.role]?.isWolf).length;
    
    if (aliveOmbra === 0) return { winner: 'Villaggio', message: 'La minaccia dell\'Ombra è stata debellata! Vittoria degli Uomini.' };
    
    const aliveNonLupi = alivePlayers.length - aliveLupi;
    if (aliveNonLupi <= aliveLupi && aliveVampiri === 0) return { winner: 'Lupi', message: 'I Lupi e i loro alleati hanno raggiunto la parità numerica. Vittoria dei Lupi!' };

    const aliveNonVampiri = alivePlayers.length - aliveVampiri;
    if (aliveNonVampiri <= aliveVampiri && aliveVampiri > 0) return { winner: 'Vampiro', message: 'Il Vampiro e le sue Progenie dominano la notte. Vittoria dei Vampiri!' };

    return null;
  };

  const victoryStatus = checkVictory();

  useEffect(() => {
    if (victoryStatus && victoryStatus.winner !== lastWinner) {
      setShowVictoryModal(true);
      setLastWinner(victoryStatus.winner);
    } else if (!victoryStatus) {
      setLastWinner(null);
    }
  }, [victoryStatus?.winner]);

  useEffect(() => {
    let interval;
    if (isTimerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime((prev) => prev - 1);
      }, 1000);
    } else if (timerTime <= 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const adjustTimer = (val) => {
    if (!isTimerRunning) setTimerTime((prev) => Math.max(0, prev + val));
  };

  const handleMasterAdd = async (e) => {
    e.preventDefault();
    if (!masterName.trim() || !masterRole || !ROLE_DATA[masterRole]) {
      alert("Inserisci un nome e seleziona un ruolo valido dalla lista!");
      return;
    }
    await addDoc(collection(db, 'players'), {
      name: masterName,
      role: masterRole,
      fazione: ROLE_DATA[masterRole].fazione,
      status: 'vivo',
      notes: '',
      votes: 0,          
      ballotVotes: 0,    
      isBallot: false,
      createdAt: Date.now() // Fondamentale per mantenere l'ordine al tavolo
    });
    setMasterName(''); 
    setMasterRole(''); 
  };

  const updateField = async (id, field, value) => {
    await updateDoc(doc(db, 'players', id), { [field]: value });
  };

  const incrementVote = async (id, currentVotes, field) => updateField(id, field, (currentVotes || 0) + 1);
  const decrementVote = async (id, currentVotes, field) => {
    if (currentVotes > 0) updateField(id, field, currentVotes - 1);
  };
  const toggleStatus = async (id, currentStatus) => {
    updateField(id, 'status', currentStatus === 'vivo' ? 'morto' : 'vivo');
  };
  const removePlayer = async (id) => await deleteDoc(doc(db, 'players', id));

  const resetAllVotes = async () => {
    if(window.confirm("Salvare lo storico e resettare tutti i voti per il nuovo Giorno?")) {
      try {
        const dayLog = players
          .filter(p => p.votes > 0 || p.ballotVotes > 0 || p.isBallot)
          .map(p => ({
            name: p.name, role: p.role, votes: p.votes, ballotVotes: p.ballotVotes, isBallot: p.isBallot
          }));
        if (dayLog.length > 0) await addDoc(collection(db, 'history'), { date: new Date().toISOString(), log: dayLog });

        const batch = writeBatch(db);
        players.forEach((p) => batch.update(doc(db, 'players', p.id), { votes: 0, ballotVotes: 0, isBallot: false }));
        await batch.commit();
      } catch (error) {
        console.error("Errore nel reset dei voti: ", error);
        alert("Si è verificato un errore durante il reset. Riprova.");
      }
    }
  };

  const resetEntireGame = async () => {
    if(window.confirm("⚠️ ATTENZIONE: Svuotare l'intera stanza e cancellare lo storico?")) {
      try {
        const batch = writeBatch(db);
        players.forEach((p) => batch.delete(doc(db, 'players', p.id)));
        history.forEach((h) => batch.delete(doc(db, 'history', h.id)));
        await batch.commit();

        setGameStarted(false);
        setTimerTime(300);
        setIsTimerRunning(false);
        setGameMode(null);
      } catch (error) {
        console.error("Errore nello svuotamento partita: ", error);
      }
    }
  };

  const FAZIONI_POSSIBILI = ["Villaggio", "Città", "Lupi del Branco", "Criminali", "Amante", "Vampiro", "Inquisizione", "Indipendenti", "Nessuna"];
  const alivePlayersList = players.filter(p => p.status === 'vivo');
  const deadPlayersList = players.filter(p => p.status === 'morto');
  const aliveCount = alivePlayersList.length;
  const totalDayVotes = players.reduce((sum, p) => sum + (p.votes || 0), 0);
  const totalBallotVotes = players.reduce((sum, p) => sum + (p.ballotVotes || 0), 0);
  const eligibleBallotVotersCount = alivePlayersList.filter(p => !(p.isBallot && p.fazione !== 'Città')).length;

  // --- SELEZIONE MODALITA' INIZIALE ---
  if (!gameMode) {
    return (
      <div className="mode-selection-overlay">
        <img src="/logo.png?v=3" alt="Wherewolf" className="mode-logo" />
        <h2 style={{ color: '#c4c4c4', marginBottom: '30px', fontWeight: 'normal' }}>Seleziona la Modalità di Gioco</h2>
        <div className="mode-grid">
          {GAME_MODES.map(mode => (
            <div key={mode} className="mode-card" onClick={() => setGameMode(mode)}>
              {mode}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      
      {/* FAB BOTTOM SHEET (MOBILE) */}
      {showFabModal && (
        <div className="modal-overlay" onClick={() => setShowFabModal(false)}>
          <div className="modal-content" style={{ marginTop: 'auto', marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px', color: '#c4c4c4' }}>Situazione al Tavolo</h3>
            <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
              <h4 style={{ color: '#4ade80', margin: '10px 0 5px 0' }}>VIVI ({alivePlayersList.length})</h4>
              {alivePlayersList.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#e0e0e0' }}><strong>{i + 1}.</strong> {p.name}</span>
                  <span style={{ color: '#888', fontSize: '0.9em' }}>{p.role}</span>
                </div>
              ))}
              
              <h4 style={{ color: '#f87171', margin: '20px 0 5px 0' }}>MORTI ({deadPlayersList.length})</h4>
              {deadPlayersList.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222', opacity: 0.5 }}>
                  <span style={{ color: '#f87171', textDecoration: 'line-through' }}>{p.name}</span>
                  <span style={{ color: '#888', fontSize: '0.9em' }}>{p.role}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => setShowFabModal(false)}>Chiudi</button>
          </div>
        </div>
      )}

      {/* POP-UP CANTILENA */}
      {showCantilenaModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button className="close-modal-btn" onClick={() => setShowCantilenaModal(false)}>×</button>
            <h2 style={{ marginTop: 0, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Moon size={24} /> Fase Notturna ({gameMode})
            </h2>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
              <button className={`btn ${cantilenaTab === 'primaNotte' ? 'btn-night' : 'btn-secondary'}`} onClick={() => setCantilenaTab('primaNotte')}>La Prima Notte</button>
              <button className={`btn ${cantilenaTab === 'nottiSuccessive' ? 'btn-night' : 'btn-secondary'}`} onClick={() => setCantilenaTab('nottiSuccessive')}>Notti Successive</button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '50vh', paddingRight: '10px' }}>
              <ol style={{ color: '#c4c4c4', lineHeight: '1.8', fontSize: '1.1em', margin: 0, paddingLeft: '25px' }}>
                {CANTILENA[gameMode][cantilenaTab].map((ruolo, idx) => (
                  <li key={idx} style={{ paddingBottom: '5px', borderBottom: '1px solid #1a1a1a' }}>{ruolo}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ALTRI POP-UP (Vittoria e Storico) */}
      {victoryStatus && showVictoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ border: `2px solid ${victoryStatus.winner === 'Villaggio' ? '#1e4d2b' : '#7f1d1d'}`, textAlign: 'center' }}>
            <button className="close-modal-btn" onClick={() => setShowVictoryModal(false)}>×</button>
            <h1 style={{ margin: '10px 0', color: victoryStatus.winner === 'Villaggio' ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', lineHeight: '1.2' }}>
              <Trophy size={32} /> VITTORIA: {victoryStatus.winner.toUpperCase()}!
            </h1>
            <p style={{ fontSize: '18px', color: '#a3a3a3' }}>{victoryStatus.message}</p>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button className="close-modal-btn" onClick={() => setShowHistoryModal(false)}>×</button>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#c4c4c4' }}>
              <History size={24} /> Storico Voti
            </h2>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
              {history.length === 0 ? (
                <p style={{ color: '#555', fontStyle: 'italic' }}>Nessun voto registrato finora.</p>
              ) : (
                history.map((h, i) => (
                  <div key={h.id} style={{ background: '#0a0a0a', border: '1px solid #222', padding: '15px', borderRadius: '4px', marginBottom: '12px' }}>
                    <h4 style={{ color: '#60a5fa', margin: '0 0 10px 0' }}>
                      Giorno {history.length - i} <span style={{ fontSize: '0.8em', color: '#555' }}>({new Date(h.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})</span>
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                      {h.log.map((logItem, idx) => (
                        <li key={idx} style={{ color: '#c4c4c4' }}>
                          <strong>{logItem.name}</strong> 
                          {logItem.votes > 0 && <span style={{ color: '#d97706', marginLeft: '8px' }}>• {logItem.votes} Voti</span>}
                          {logItem.isBallot && <span style={{ color: '#dc2626', marginLeft: '8px' }}>[BALLOTTAGGIO: {logItem.ballotVotes}]</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="header-container">
        <img src="/logo.png?v=3" alt="Wherewolf" className="header-logo" />

        <div className="button-group">
          
          <div className="button-row">
            <div className="timer-container">
              <button className="timer-btn" onClick={() => adjustTimer(-60)}>-1m</button>
              <div className="timer-display" style={{ color: timerTime <= 10 && isTimerRunning ? '#f87171' : '#c4c4c4' }}>{formatTime(timerTime)}</div>
              <button className="timer-btn" onClick={() => adjustTimer(60)}>+1m</button>
              <button className="timer-btn" style={{ marginLeft: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsTimerRunning(!isTimerRunning)}>
                {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button className="timer-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setIsTimerRunning(false); setTimerTime(300); }}>
                <RotateCcw size={16} />
              </button>
            </div>

            <button className={`btn ${gameStarted ? 'btn-stop' : 'btn-start'}`} onClick={() => setGameStarted(!gameStarted)}>
              {gameStarted ? <><Square size={16} /> Ferma Partita</> : <><Play size={16} /> Avvia Partita</>}
            </button>
            <button className="btn btn-day" onClick={resetAllVotes}><Sun size={16} /> Nuovo Giorno</button>
            <button className="btn btn-danger" onClick={resetEntireGame}><Trash2 size={16} /> Nuova Partita</button>
          </div>

          <div className="button-row">
            <button className="btn btn-night" onClick={() => setShowCantilenaModal(true)}>
              <Moon size={16} /> Fase Notturna
            </button>
            <button className="btn btn-secondary" onClick={() => setShowHistoryModal(true)}>
              <History size={16} /> Storico
            </button>
            <a href={MANUALS[gameMode] || "/Regolamento WhereWolf.pdf"} target="_blank" rel="noopener noreferrer" className="btn btn-link">
              <BookOpen size={16} /> Manuale ({gameMode})
            </a>
          </div>

        </div>
      </div>

      {!gameStarted && (
        <div className="form-container">
          <h3 style={{ marginTop: 0, color: '#c4c4c4', display: 'flex', alignItems: 'center', gap: '8px' }}>Aggiungi Giocatori alla Stanza</h3>
          <form className="add-form" onSubmit={handleMasterAdd}>
            <input className="dark-input" type="text" placeholder="Nome giocatore" value={masterName} onChange={(e) => setMasterName(e.target.value)} required style={{ flex: 1 }}/>
            <input className="dark-input" list="role-suggestions" placeholder={`Cerca ruolo per ${gameMode}...`} value={masterRole} onChange={(e) => setMasterRole(e.target.value)} required style={{ flex: 1 }}/>
            <datalist id="role-suggestions">{sortedRoles.map(r => <option key={r} value={r} />)}</datalist>
            <button type="submit" className="btn btn-secondary" style={{ color: '#fff' }}><Plus size={16} /> Aggiungi</button>
          </form>
        </div>
      )}

      {gameStarted && (
        <div className="mobile-stats">
          <div style={{ color: '#d97706', marginBottom: '5px' }}><strong>Voti Giorno:</strong> {totalDayVotes}/{aliveCount}</div>
          <div style={{ color: '#dc2626' }}><strong>Voti Ballottaggio:</strong> {totalBallotVotes}/{eligibleBallotVotersCount}</div>
        </div>
      )}

      {players.length > 0 && (
        <div className="table-wrapper">
          <table className="game-table">
            <colgroup>
              <col style={{ width: '11%' }} /> 
              <col style={{ width: '12%' }} /> 
              <col style={{ width: '7%' }} />  
              <col style={{ width: '13%' }} /> 
              <col style={{ width: '13%' }} /> 
              <col style={{ width: '10%' }} /> 
              <col style={{ width: '14%' }} /> 
              <col style={{ width: '9%' }} />  
              <col style={{ width: '11%' }} /> 
            </colgroup>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Nome</th>
                <th>Ruolo</th>
                <th>Mistico</th>
                <th>Fazione & Aura</th>
                <th>Note</th>
                <th>Voti<br/><span style={{ color: '#d97706' }}>({totalDayVotes}/{aliveCount})</span></th>
                <th style={{ backgroundColor: '#1a0505', borderBottom: '2px solid #450a0a', color: '#c4c4c4' }}>
                  Ballottaggio<br/><span style={{ color: '#dc2626' }}>({totalBallotVotes}/{eligibleBallotVotersCount})</span>
                </th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const roleInfo = ROLE_DATA[p.role] || { aura: "?" };
                const isDead = p.status === 'morto';
                let currentAura = roleInfo.aura;
                if (p.fazione === "Vampiro") currentAura = "Oscura";
                if (p.fazione === "Lupi del Branco" && roleInfo.fazione !== "Lupi del Branco") currentAura = "Oscura";
                const rowClass = isDead ? 'row-dead animated-row' : p.isBallot ? 'row-ballot animated-row' : 'row-alive animated-row';
                
                return (
                  <tr key={p.id} className={rowClass}>
                    <td data-label="Nome" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '1.1em', color: '#e0e0e0' }}>{p.name}</td>
                    <td data-label="Ruolo">{p.role}</td>
                    <td data-label="Mistico" style={{ fontWeight: 'bold', color: roleInfo.misticismo === 'Sì' ? '#9333ea' : '#555' }}>{roleInfo.misticismo || 'No'}</td>
                    <td data-label="Fazione & Aura">
                      <div className="fazione-wrapper">
                        <select className="dark-input" style={{ width: '100%', maxWidth: '140px', padding: '4px', marginBottom: '4px' }} value={p.fazione || roleInfo.fazione} onChange={(e) => updateField(p.id, 'fazione', e.target.value)}>
                          {FAZIONI_POSSIBILI.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <span style={{ fontSize: '0.85em', color: '#777' }}>(Aura: {currentAura})</span>
                      </div>
                    </td>
                    <td data-label="Note"><input className="dark-input" type="text" defaultValue={p.notes || ''} onBlur={(e) => updateField(p.id, 'notes', e.target.value)} placeholder="..." style={{ width: '100%', padding: '6px' }} /></td>
                    <td data-label="Voti">
                      {!isDead ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <button className="action-btn" onClick={() => decrementVote(p.id, p.votes, 'votes')}>-</button>
                          <span style={{ fontSize: '1.2em', fontWeight: 'bold', minWidth: '20px', textAlign: 'center', color: '#d97706' }}>{p.votes || 0}</span>
                          <button className="action-btn" onClick={() => incrementVote(p.id, p.votes, 'votes')}>+</button>
                        </div>
                      ) : (<span style={{ color: '#333', fontStyle: 'italic' }}>-</span>)}
                    </td>
                    <td data-label="Ballottaggio" style={{ borderLeft: '1px solid #333' }}>
                      {!isDead ? (
                        <div className="ballot-wrapper">
                          <label style={{ fontSize: '0.85em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, color: '#aaa' }}>
                            <input type="checkbox" style={{ transform: 'scale(1.2)' }} checked={p.isBallot || false} onChange={(e) => updateField(p.id, 'isBallot', e.target.checked)} />
                            Ballottante
                          </label>
                          {p.isBallot && (
                             <div className="ballot-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                               <button className="action-btn" onClick={() => decrementVote(p.id, p.ballotVotes, 'ballotVotes')}>-</button>
                               <span style={{ fontSize: '1.2em', fontWeight: 'bold', minWidth: '20px', textAlign: 'center', color: '#dc2626' }}>{p.ballotVotes || 0}</span>
                               <button className="action-btn" onClick={() => incrementVote(p.id, p.ballotVotes, 'ballotVotes')}>+</button>
                             </div>
                          )}
                        </div>
                      ) : (<span style={{ color: '#333', fontStyle: 'italic' }}>-</span>)}
                    </td>
                    <td data-label="Stato"><span className={`status-badge ${isDead ? 'status-morto' : 'status-vivo'}`}>{isDead ? 'Morto' : 'Vivo'}</span></td>
                    <td data-label="Azioni">
                      <div className="actions-wrapper">
                        {gameStarted ? (
                          <button onClick={() => toggleStatus(p.id, p.status)} className="action-btn" title={isDead ? "Resuscita" : "Uccidi"}>
                            {isDead ? <Heart size={18} color="#f87171" /> : <Skull size={18} />}
                          </button>
                        ) : (
                          <button onClick={() => removePlayer(p.id)} className="action-btn" style={{ borderColor: 'transparent', background: 'transparent' }} title="Elimina Giocatore">
                            <Trash2 size={20} color="#7f1d1d" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* BOTTONE FLOATING PER MOBILE */}
      <button className="fab-button" onClick={() => setShowFabModal(true)}>
        <Eye size={24} />
      </button>

    </div>
  );
}

export default App;