// ==========================================
// IMPORTS
// ==========================================
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import {
  BookOpen, DoorOpen, Eye, Heart, History, Menu, Moon, Pause, Play, Plus, RotateCcw,
  Skull, Square, Sun, Trash2, Trophy, Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import './App.css';
import { db } from './firebase';
import { ROLE_DATA } from './roles';
import PlayerCard from './PlayerCard';

// ==========================================
// COSTANTI E CONFIGURAZIONI GIOCO
// ==========================================
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
    primaNotte: ["Veggente", "Mago", "Criminali", "Guardie", "Monaco", "Cacciatore di Vampiri", "Prete", "Giulietta", "Angelo Custode", "L'amuleto e la spada", "Lupi del branco", "Vampiro"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "L'amuleto e la spada", "Lupi Mannari", "Vampiro", "Guaritore"]
  },
  "Darkest Night": {
    primaNotte: ["Veggente", "Mago", "Inquisizione", "Criminali", "Guardie", "Monaco", "Bracconiere", "Cacciatore di Vampiri", "Becchino", "Prete", "Giulietta", "Angelo Custode", "L'amuleto e la spada", "Lupi del branco", "Lupo Solitario", "Vampiro", "Nosferatu", "Negromante", "Posseduto", "Guaritore"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "Strega", "L'amuleto e la spada", "Lupi Mannari", "Vampiro", "Nosferatu", "Guaritore", "Posseduto"]
  },
  "Cappuccetto Rosso": {
    primaNotte: ["Veggente", "Mago", "Criminali", "Guardie", "Monaco", "Cacciatore di Vampiri", "Prete", "Giulietta", "Angelo Custode", "L'amuleto e la spada", "Lupi del branco", "Vampiro"],
    nottiSuccessive: ["Veggente", "Medium", "Mago", "L'amuleto e la spada", "Lupi Mannari", "Vampiro", "Guaritore"]
  }
};

const EXP_DUE_LUNE = ["Guardia", "Altra Guardia", "Azzeccagarbugli", "Bocca di Rosa", "Borgomastro", "Mercante", "Oratore", "Assassino", "Capo Gilda", "Guardia Corrotta", "Ladra", "Spia", "Angelo Custode", "Giulietta", "Vampiro", "Ghoul", "Cacciatore di Vampiri"];
const EXP_DARKEST = ["Inquisitore", "Boia", "Templare", "Appestato", "Becchino", "Bracconiere", "Mostro", "Lupo Reietto", "Lupo Solitario", "Nosferatu", "Negromante", "Posseduto", "Megera", "Fantasma", "Presenza", "Spettro", "Viaggiatore"];
const EXP_RED_HOOD = ["Cappuccetto Rosso", "Cacciatore", "Nonna", "Lupo (Cappuccetto)"];

export default function App() {
  // ==========================================
  // STATI: STANZE E MODALITA'
  // ==========================================
  const [roomCode, setRoomCode] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [gameMode, setGameMode] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);

  // ==========================================
  // STATI: DATI PARTITA
  // ==========================================
  const [players, setPlayers] = useState([]);
  const [history, setHistory] = useState([]);
  const [masterName, setMasterName] = useState('');
  const [masterRole, setMasterRole] = useState('');

  // ==========================================
  // STATI: UI E POP-UP
  // ==========================================
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCantilenaModal, setShowCantilenaModal] = useState(false);
  const [showFabModal, setShowFabModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [cantilenaTab, setCantilenaTab] = useState('primaNotte');
  const [lastWinner, setLastWinner] = useState(null);

  // ==========================================
  // STATI: TIMER E HELPER
  // ==========================================
  const [timerTime, setTimerTime] = useState(300);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const getExpirationDate = () => Timestamp.fromDate(new Date(Date.now() + 6 * 60 * 60 * 1000));

  // ==========================================
  // EFFETTO: SPAZZINO AUTOMATICO STANZE SCADUTE
  // ==========================================
  useEffect(() => {
    const cleanupGhostRooms = async () => {
      if (roomCode) return; // Esegue la pulizia solo se sei nella lobby
      
      try {
        const roomsSnap = await getDocs(collection(db, 'rooms'));
        roomsSnap.forEach(async (roomDoc) => {
          const data = roomDoc.data();
          
          // Se esiste una data di scadenza ed è passata
          if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
             // 1. Elimina tutti i giocatori della stanza
             const playersSnap = await getDocs(collection(db, 'rooms', roomDoc.id, 'players'));
             playersSnap.forEach(p => deleteDoc(doc(db, 'rooms', roomDoc.id, 'players', p.id)));

             // 2. Elimina tutto lo storico
             const historySnap = await getDocs(collection(db, 'rooms', roomDoc.id, 'history'));
             historySnap.forEach(h => deleteDoc(doc(db, 'rooms', roomDoc.id, 'history', h.id)));

             // 3. Elimina la stanza stessa
             await deleteDoc(doc(db, 'rooms', roomDoc.id));
             console.log(`Stanza fantasma ${roomDoc.id} eliminata.`);
          }
        });
      } catch (error) {
        console.error("Errore pulizia automatica:", error);
      }
    };

    cleanupGhostRooms();
  }, [roomCode]);

  // ==========================================
  // EFFETTI: URL E CONNESSIONE DATABASE
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) setRoomCode(room.toUpperCase());
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    const roomRef = doc(db, 'rooms', roomCode);
    const unsubRoom = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGameMode(data.gameMode || null);
        setGameStarted(data.gameStarted || false);
      }
    });

    const playersRef = collection(db, 'rooms', roomCode, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersData.sort((a, b) => {
        if (a.status === 'vivo' && b.status === 'morto') return -1;
        if (a.status === 'morto' && b.status === 'vivo') return 1;
        return a.createdAt - b.createdAt;
      }));
    });

    const historyRef = collection(db, 'rooms', roomCode, 'history');
    const unsubHistory = onSnapshot(historyRef, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(historyData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });

    return () => { unsubRoom(); unsubPlayers(); unsubHistory(); };
  }, [roomCode]);

  // ==========================================
  // EFFETTI: VITTORIA E TIMER
  // ==========================================
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
      interval = setInterval(() => setTimerTime((prev) => prev - 1), 1000);
    } else if (timerTime <= 0 && isTimerRunning) setIsTimerRunning(false);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ==========================================
  // LOGICA: GESTIONE LOBBY E STANZE
  // ==========================================
  const createRoom = async () => {
    const newCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    await setDoc(doc(db, 'rooms', newCode), { createdAt: Date.now(), expiresAt: getExpirationDate(), gameStarted: false, gameMode: null });
    window.history.pushState({}, '', `?room=${newCode}`);
    setRoomCode(newCode);
  };

  const joinRoom = () => {
    if (joinCodeInput.trim().length !== 5) return alert("Il codice deve essere di 5 caratteri esatti!");
    const code = joinCodeInput.trim().toUpperCase();
    window.history.pushState({}, '', `?room=${code}`);
    setRoomCode(code);
  };

  const exitRoom = async () => {
    if(window.confirm("Sei sicuro di voler uscire?")) {
      try {
        const batch = writeBatch(db);
        players.forEach((p) => batch.delete(doc(db, 'rooms', roomCode, 'players', p.id)));
        history.forEach((h) => batch.delete(doc(db, 'rooms', roomCode, 'history', h.id)));
        batch.delete(doc(db, 'rooms', roomCode));
        await batch.commit();

        setRoomCode(null);
        setGameMode(null);
        setGameStarted(false);
        window.history.pushState({}, '', window.location.pathname);
      } catch (error) {
        console.error("Errore nell'uscita: ", error);
      }
    }
  };

  // ==========================================
  // LOGICA: MECCANICHE DI GIOCO E POP-UP
  // ==========================================
  const handleToggleModal = (modalType) => {
    setShowFabModal(modalType === 'stato' ? !showFabModal : false);
    setShowDayModal(modalType === 'giorno' ? !showDayModal : false);
    setShowCantilenaModal(modalType === 'notte' ? !showCantilenaModal : false);
    setShowMobileMenu(modalType === 'menu' ? !showMobileMenu : false);
  };

  const handleSetGameMode = async (mode) => await setDoc(doc(db, 'rooms', roomCode), { gameMode: mode }, { merge: true });
  const toggleGameStarted = async () => await setDoc(doc(db, 'rooms', roomCode), { gameStarted: !gameStarted }, { merge: true });
  const adjustTimer = (val) => { if (!isTimerRunning) setTimerTime((prev) => Math.max(0, prev + val)); };

  const getFilteredRoles = () => {
    const allRoles = Object.keys(ROLE_DATA);
    let available = allRoles;
    if (gameMode === "Una Luna") available = allRoles.filter(r => !EXP_DUE_LUNE.includes(r) && !EXP_DARKEST.includes(r) && !EXP_RED_HOOD.includes(r));
    else if (gameMode === "Una + Due Lune") available = allRoles.filter(r => !EXP_DARKEST.includes(r) && !EXP_RED_HOOD.includes(r));
    else if (gameMode === "Darkest Night") available = allRoles.filter(r => !EXP_RED_HOOD.includes(r));
    else if (gameMode === "Cappuccetto Rosso") available = allRoles.filter(r => !EXP_DUE_LUNE.includes(r) && !EXP_DARKEST.includes(r));
    return available.sort((a, b) => a.localeCompare(b));
  };
  const sortedRoles = getFilteredRoles();

  const handleMasterAdd = async (e) => {
    e.preventDefault();
    if (!masterName.trim() || !masterRole || !ROLE_DATA[masterRole]) return alert("Inserisci un nome e un ruolo valido!");
    await addDoc(collection(db, 'rooms', roomCode, 'players'), {
      name: masterName.trim().toUpperCase(), role: masterRole, fazione: ROLE_DATA[masterRole].fazione,
      status: 'vivo', notes: '', votes: 0, ballotVotes: 0, isBallot: false, 
      createdAt: Date.now(), expiresAt: getExpirationDate()
    });
    setMasterName(''); setMasterRole(''); 
  };

  const updateField = async (id, field, value) => await updateDoc(doc(db, 'rooms', roomCode, 'players', id), { [field]: value });
  const incrementVote = async (id, currentVotes, field) => updateField(id, field, (currentVotes || 0) + 1);
  const decrementVote = async (id, currentVotes, field) => { if (currentVotes > 0) updateField(id, field, currentVotes - 1); };
  const toggleStatus = async (id, currentStatus) => updateField(id, 'status', currentStatus === 'vivo' ? 'morto' : 'vivo');
  const removePlayer = async (id) => await deleteDoc(doc(db, 'rooms', roomCode, 'players', id));

  const resetAllVotes = async () => {
    try {
      const dayLog = players.filter(p => (p.votes || 0) > 0 || (p.ballotVotes || 0) > 0 || (p.isBallot === true)).map(p => ({
          name: p.name || 'Ignoto', role: p.role || 'Ignoto', votes: p.votes || 0, ballotVotes: p.ballotVotes || 0, isBallot: p.isBallot || false
      }));
      if (dayLog.length > 0) await addDoc(collection(db, 'rooms', roomCode, 'history'), { date: new Date().toISOString(), log: dayLog, expiresAt: getExpirationDate() });
      const batch = writeBatch(db);
      players.forEach((p) => batch.update(doc(db, 'rooms', roomCode, 'players', p.id), { votes: 0, ballotVotes: 0, isBallot: false }));
      await batch.commit();
      setShowDayModal(false);
    } catch (error) {
      alert("Errore durante il reset: " + error.message);
    }
  };

  const resetEntireGame = async () => {
    if(window.confirm("⚠️ ATTENZIONE: Questa azione svuoterà i giocatori e lo storico per ricominciare in questa stanza. Procedere?")) {
      try {
        const batch = writeBatch(db);
        players.forEach((p) => batch.delete(doc(db, 'rooms', roomCode, 'players', p.id)));
        history.forEach((h) => batch.delete(doc(db, 'rooms', roomCode, 'history', h.id)));
        batch.update(doc(db, 'rooms', roomCode), { gameStarted: false, gameMode: null });
        await batch.commit();
        setTimerTime(300);
        setIsTimerRunning(false);
      } catch (error) {
        console.error("Errore nello svuotamento partita: ", error);
      }
    }
  };

  // ==========================================
  // VALORI CALCOLATI
  // ==========================================
  const FAZIONI_POSSIBILI = ["Villaggio", "Città", "Lupi del Branco", "Criminali", "Amante", "Vampiro", "Inquisizione", "Indipendenti", "Nessuna"];
  const alivePlayersList = players.filter(p => p.status === 'vivo');
  const deadPlayersList = players.filter(p => p.status === 'morto');
  const aliveCount = alivePlayersList.length;
  const totalDayVotes = players.reduce((sum, p) => sum + (p.votes || 0), 0);
  const totalBallotVotes = players.reduce((sum, p) => sum + (p.ballotVotes || 0), 0);
  const eligibleBallotVotersCount = alivePlayersList.filter(p => !(p.isBallot && p.fazione !== 'Città')).length;

  // ==========================================
  // RENDER: LOBBY INIZIALE
  // ==========================================
  if (!roomCode) {
    return (
      <div className="lobby-overlay">
        <img src="/logo.png?v=3" alt="Wherewolf" className="lobby-logo" />
        <div className="lobby-box">
          <button className="btn btn-start" style={{ width: '100%', fontSize: '1.1em', padding: '15px' }} onClick={createRoom}>
            <Plus size={20} /> Crea Nuova Stanza
          </button>
          <div className="lobby-divider"><span>OPPURE</span></div>
          <input className="lobby-input" type="text" placeholder="CODICE" maxLength={5} value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value)} />
          <button className="btn btn-secondary" style={{ width: '100%', fontSize: '1.1em', padding: '15px', color: '#fff' }} onClick={joinRoom}>
            <Users size={20} /> Unisciti a Stanza
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: SELEZIONE MODALITA'
  // ==========================================
  if (!gameMode) {
    return (
      <div className="mode-selection-overlay">
        <img src="/logo.png?v=3" alt="Wherewolf" className="mode-logo" />
        <h2 style={{ color: '#c4c4c4', marginBottom: '30px', fontWeight: 'normal' }}>
          Stanza <span className="room-badge">{roomCode}</span>
        </h2>
        <div className="mode-grid">
          {GAME_MODES.map(mode => (
            <div key={mode} className="mode-card" onClick={() => handleSetGameMode(mode)}>{mode}</div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN DASHBOARD E POP-UP
  // ==========================================
  return (
    <div className="dashboard-container">
      
      {/* POP-UP STATO TAVOLO */}
      {showFabModal && (
        <div className="modal-overlay" onClick={() => setShowFabModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px', color: '#c4c4c4' }}>Situazione al Tavolo</h3>
            <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
              <h4 style={{ color: '#4ade80', margin: '10px 0 5px 0' }}>VIVI ({alivePlayersList.length})</h4>
              {alivePlayersList.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#e0e0e0' }}>
                    <strong>{i + 1}.</strong> {p.name}
                    {p.notes && <span style={{ color: '#f5ce6c', fontStyle: 'italic', fontSize: '0.85em', marginLeft: '8px' }}>- {p.notes}</span>}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.9em' }}>{p.role}</span>
                </div>
              ))}
              <h4 style={{ color: '#f87171', margin: '20px 0 5px 0' }}>MORTI ({deadPlayersList.length})</h4>
              {deadPlayersList.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222', opacity: 0.5 }}>
                  <span>
                    <span style={{ color: '#f87171', textDecoration: 'line-through' }}>{p.name}</span>
                    {p.notes && <span style={{ color: '#f5ce6c', fontStyle: 'italic', fontSize: '0.85em', marginLeft: '8px' }}>- {p.notes}</span>}
                  </span>
                  <span style={{ color: '#888', fontSize: '0.9em' }}>{p.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* POP-UP MENU HAMBURGER */}
      {showMobileMenu && (
        <div className="modal-overlay" onClick={() => setShowMobileMenu(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px', color: '#c4c4c4' }}>Opzioni Partita</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className={`btn ${gameStarted ? 'btn-stop' : 'btn-start'}`} onClick={() => { toggleGameStarted(); setShowMobileMenu(false); }} style={{ padding: '12px' }}>
                {gameStarted ? <><Square size={18} /> Ferma Partita</> : <><Play size={18} /> Avvia Partita</>}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowHistoryModal(true); setShowMobileMenu(false); }} style={{ padding: '12px' }}>
                <History size={18} /> Storico
              </button>
              <a href={MANUALS[gameMode] || "/Regolamento WhereWolf.pdf"} target="_blank" rel="noopener noreferrer" className="btn btn-link" style={{ padding: '12px' }}>
                <BookOpen size={18} /> Manuale
              </a>
              <button className="btn btn-danger" onClick={() => { resetEntireGame(); setShowMobileMenu(false); }} style={{ padding: '12px' }}>
                <Trash2 size={18} /> Nuova Partita
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP NUOVO GIORNO (Riepilogo Voti) */}
      {showDayModal && (
        <div className="modal-overlay" onClick={() => setShowDayModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setShowDayModal(false)}>×</button>
            <h2 style={{ marginTop: 0, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
              <Sun size={24} /> Riepilogo Voti
            </h2>
            <div style={{ overflowY: 'auto', maxHeight: '50vh', paddingRight: '10px', marginBottom: '20px' }}>
              {players.some(p => p.isBallot && p.status === 'vivo') ? (
                <>
                  <h4 style={{ color: '#dc2626', margin: '0 0 10px 0' }}>BALLOTTANTI</h4>
                  {players.sort((p1, p2) => p1.ballotVotes < p2.ballotVotes).filter(p => p.isBallot && p.status === 'vivo').map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222' }}>
                      <span style={{ color: '#e0e0e0' }}>{p.name} <span style={{ color: '#888', fontSize: '0.85em' }}>({p.role})</span></span>
                      <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{p.ballotVotes || 0} Voti</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <h4 style={{ color: '#d97706', margin: '0 0 10px 0' }}>VOTI DEL GIORNO</h4>
                  {alivePlayersList.sort((p1,p2) => p1.votes < p2.votes).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222' }}>
                      <span style={{ color: '#e0e0e0' }}>{p.name} <span style={{ color: '#888', fontSize: '0.85em' }}>({p.role})</span></span>
                      <span style={{ color: '#d97706', fontWeight: 'bold' }}>{p.votes || 0} Voti</span>
                    </div>
                  ))}
                </>
              )}
            </div>
            <button className="btn btn-day" style={{ width: '100%', padding: '12px', fontSize: '1.1em', display: 'flex', justifyContent: 'center' }} onClick={resetAllVotes}>
              CONFERMA E RESETTA
            </button>
          </div>
        </div>
      )}

      {/* POP-UP CANTILENA */}
      {showCantilenaModal && (
        <div className="modal-overlay" onClick={() => setShowCantilenaModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '15px', marginBottom: '20px' }}>
              <Moon size={24} /> Fase Notturna
            </h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button className={`btn ${cantilenaTab === 'primaNotte' ? 'btn-night' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setCantilenaTab('primaNotte')}>La Prima Notte</button>
              <button className={`btn ${cantilenaTab === 'nottiSuccessive' ? 'btn-night' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => setCantilenaTab('nottiSuccessive')}>Notti Successive</button>
            </div>
            <div style={{ overflowY: 'auto', maxHeight: '50vh', paddingRight: '10px' }}>
              <ol style={{ color: '#c4c4c4', lineHeight: '1.8', fontSize: '1.1em', margin: 0, paddingLeft: '45px' }}>
                {CANTILENA[gameMode][cantilenaTab].map((ruolo, idx) => (
                  <li key={idx} style={{ paddingBottom: '5px', borderBottom: '1px solid #1a1a1a' }}>{ruolo}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP VITTORIA */}
      {victoryStatus && showVictoryModal && (
        <div className="modal-overlay" onClick={() => setShowVictoryModal(false)}>
          <div className="modal-content" style={{ border: `2px solid ${victoryStatus.winner === 'Villaggio' ? '#1e4d2b' : '#7f1d1d'}`, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <h1 style={{ margin: '10px 0', color: victoryStatus.winner === 'Villaggio' ? '#4ade80' : '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', lineHeight: '1.2' }}>
              <Trophy size={32} /> VITTORIA: {victoryStatus.winner.toUpperCase()}!
            </h1>
            <p style={{ fontSize: '18px', color: '#a3a3a3' }}>{victoryStatus.message}</p>
          </div>
        </div>
      )}

      {/* POP-UP STORICO */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
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
                        <li key={idx} style={{ color: '#c4c4c4', listStyleType: 'none', padding: '5px 0', borderBottom: '1px solid #222'}}>
                          <strong>{logItem.name} </strong><span style={{ color: '#888888'}}>({logItem.role})</span>
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

      {/* --- HEADER E LOGO --- */}
      <div className="header-container">
        <img src="/logo.png?v=3" alt="Wherewolf" className="header-logo" />
        <div className="room-badge-container">
          <span className="room-badge">STANZA: {roomCode}</span>
          <button className="action-btn" onClick={exitRoom} style={{ backgroundColor: '#1a0505', borderColor: '#450a0a', color: '#f87171', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '8px'}} title="Esci">
            <DoorOpen size={18} /> ESCI
          </button>
        </div>
      </div>

      {/* --- BARRA STICKY (TIMER E VOTI) SOLO IN PARTITA --- */}
      {gameStarted && (
        <div className="sticky-dashboard-bar">
          <div className="timer-wrapper">
            <div className="timer-row">
              <button className="timer-btn" onClick={() => adjustTimer(-60)}>-1m</button>
              <div className="timer-display" style={{ color: timerTime <= 10 && isTimerRunning ? '#f87171' : '#c4c4c4' }}>{formatTime(timerTime)}</div>
              <button className="timer-btn" onClick={() => adjustTimer(60)}>+1m</button>
            </div>
            <div className="timer-row">
              <button className="timer-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '4px 0' }} onClick={() => setIsTimerRunning(!isTimerRunning)}>
                {isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button className="timer-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '4px 0' }} onClick={() => { setIsTimerRunning(false); setTimerTime(300); }}>
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          <div className="sticky-stats">
            {players.some(p => p.isBallot && p.status === 'vivo') ? (
              <div style={{ color: '#dc2626' }}>Voti Ballottaggio<br/><strong>{totalBallotVotes} / {eligibleBallotVotersCount}</strong></div>
            ) : (
              <div style={{ color: '#d97706' }}>Voti Giorno<br/><strong>{totalDayVotes} / {aliveCount}</strong></div>
            )}
          </div>
        </div>
      )}

      {/* --- CONTROLLI DESKTOP --- */}
      <div className="desktop-controls desktop-only">
        <div className="button-row">
          <button className={`btn ${gameStarted ? 'btn-stop' : 'btn-start'}`} onClick={toggleGameStarted}>
            {gameStarted ? <><Square size={16} /> Ferma Partita</> : <><Play size={16} /> Avvia Partita</>}
          </button>
          <button className="btn btn-danger" onClick={resetEntireGame} title="Svuota stanza e cancella lo storico">
            <Trash2 size={16} /> Nuova Partita
          </button>
          <button className="btn btn-day" onClick={() => setShowDayModal(true)}>
            <Sun size={16} /> Nuovo Giorno
          </button>
          <button className="btn btn-night" onClick={() => setShowCantilenaModal(true)}>
            <Moon size={16} /> Fase Notturna
          </button>
          <button className="btn btn-secondary" onClick={() => setShowHistoryModal(true)}>
            <History size={16} /> Storico
          </button>
          <a href={MANUALS[gameMode] || "/Regolamento WhereWolf.pdf"} target="_blank" rel="noopener noreferrer" className="btn btn-link">
            <BookOpen size={16} /> Manuale
          </a>
        </div>
      </div>

      {/* --- FORM INSERIMENTO GIOCATORI --- */}
      {!gameStarted && (
        <div className="form-container">
          <h3 style={{ marginTop: 0, color: '#c4c4c4', display: 'flex', alignItems: 'center', gap: '8px' }}>Aggiungi Giocatori</h3>
          <form className="add-form" onSubmit={handleMasterAdd}>
            <input className="dark-input" type="text" placeholder="Nome giocatore" value={masterName} onChange={(e) => setMasterName(e.target.value)} required style={{ flex: 1 }}/>
            <input className="dark-input" list="role-suggestions" placeholder={`Cerca ruolo per ${gameMode}...`} value={masterRole} onChange={(e) => setMasterRole(e.target.value)} required style={{ flex: 1 }}/>
            <datalist id="role-suggestions">{sortedRoles.map(r => <option key={r} value={r} />)}</datalist>
            <button type="submit" className="btn btn-secondary" style={{ color: '#fff' }}><Plus size={16} /> Aggiungi</button>
          </form>
        </div>
      )}

      {/* --- PLAYERS --- */}
      {players.length > 0 && (
        <>
          {/* Desktop */}
          <div className="table-wrapper">
            <table className="game-table">
              <colgroup>
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>

              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Nome</th>
                  <th>Ruolo</th>
                  <th>Mistico</th>
                  <th>Fazione & Aura</th>
                  <th>Note</th>
                  <th>Voti</th>
                  <th
                    style={{
                      backgroundColor: "#1a0505",
                      borderBottom: "2px solid #450a0a",
                      color: "#c4c4c4",
                    }}
                  >
                    Ballottaggio
                  </th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>

              <tbody>
                {players.map((p) => {
                  const roleInfo = ROLE_DATA[p.role] || { aura: "?" };
                  const isDead = p.status === "morto";

                  let currentAura = roleInfo.aura;

                  if (p.fazione === "Vampiro") currentAura = "Oscura";

                  if (
                    p.fazione === "Lupi del Branco" &&
                    roleInfo.fazione !== "Lupi del Branco"
                  )
                    currentAura = "Oscura";

                  const rowClass = isDead
                    ? "row-dead animated-row"
                    : p.isBallot
                    ? "row-ballot animated-row"
                    : "row-alive animated-row";

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

          {/* Mobile */}
          <div className="mobile-player-list">
            {players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                roleInfo={ROLE_DATA[p.role] || {}}
                gameStarted={gameStarted}
                FAZIONI_POSSIBILI={FAZIONI_POSSIBILI}
                updateField={updateField}
                incrementVote={incrementVote}
                decrementVote={decrementVote}
                toggleStatus={toggleStatus}
                removePlayer={removePlayer}
              />
            ))}
          </div>
        </>
      )}

      {/* --- BOTTOM NAV BAR (MOBILE) --- */}
      <div className="bottom-nav-bar">
        <button className={`bottom-nav-item ${showFabModal ? 'active' : ''}`} onClick={() => handleToggleModal('stato')}>
          <Eye size={22} />
          <span>Stato</span>
        </button>
        <button className={`bottom-nav-item ${showDayModal ? 'active' : ''}`} onClick={() => handleToggleModal('giorno')}>
          <Sun size={22} />
          <span>Giorno</span>
        </button>
        <button className={`bottom-nav-item ${showCantilenaModal ? 'active' : ''}`} onClick={() => handleToggleModal('notte')}>
          <Moon size={22} />
          <span>Notte</span>
        </button>
        <button className={`bottom-nav-item ${showMobileMenu ? 'active' : ''}`} onClick={() => handleToggleModal('menu')}>
          <Menu size={22} />
          <span>Menù</span>
        </button>
      </div>

    </div>
  );
}