import { addDoc, collection, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import './App.css';
import { db } from './firebase';
import { ROLE_DATA } from './roles';

function App() {
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);

  const [masterName, setMasterName] = useState('');
  const [masterRole, setMasterRole] = useState('');

  const sortedRoles = Object.keys(ROLE_DATA).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPlayers(playersData.sort((a, b) => a.name.localeCompare(b.name)));
    });
    return () => unsubscribe();
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
    
    if (aliveOmbra === 0) {
      return { winner: 'Villaggio', message: 'La minaccia dell\'Ombra è stata debellata! Vittoria degli Uomini.' };
    }

    const aliveNonLupi = alivePlayers.length - aliveLupi;
    if (aliveNonLupi <= aliveLupi && aliveVampiri === 0) {
      return { winner: 'Lupi', message: 'I Lupi e i loro alleati hanno raggiunto la parità numerica. Vittoria dei Lupi!' };
    }

    const aliveNonVampiri = alivePlayers.length - aliveVampiri;
    if (aliveNonVampiri <= aliveVampiri && aliveVampiri > 0) {
      return { winner: 'Vampiro', message: 'Il Vampiro e le sue Progenie dominano la notte. Vittoria dei Vampiri!' };
    }

    return null;
  };

  const victoryStatus = checkVictory();

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
      isBallot: false    
    });
    setMasterName(''); 
    setMasterRole(''); 
  };

  const updateField = async (id, field, value) => {
    const playerRef = doc(db, 'players', id);
    await updateDoc(playerRef, { [field]: value });
  };

  const incrementVote = async (id, currentVotes, field) => {
    updateField(id, field, (currentVotes || 0) + 1);
  };

  const decrementVote = async (id, currentVotes, field) => {
    if (currentVotes > 0) {
      updateField(id, field, currentVotes - 1);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'vivo' ? 'morto' : 'vivo';
    updateField(id, 'status', newStatus);
  };

  const removePlayer = async (id) => {
    await deleteDoc(doc(db, 'players', id));
  };

  const resetAllVotes = () => {
    players.forEach(async (p) => {
        const playerRef = doc(db, 'players', p.id);
        await updateDoc(playerRef, { votes: 0, ballotVotes: 0, isBallot: false });
      });
  };

  const resetEntireGame = () => {
    players.forEach(async (p) => {
        await deleteDoc(doc(db, 'players', p.id));
      });
      setGameStarted(false);
  };

  const FAZIONI_POSSIBILI = ["Villaggio", "Città", "Lupi del Branco", "Criminali", "Amante", "Vampiro", "Inquisizione", "Indipendenti", "Nessuna"];

  const alivePlayersList = players.filter(p => p.status === 'vivo');
  const aliveCount = alivePlayersList.length;

  const totalDayVotes = players.reduce((sum, p) => sum + (p.votes || 0), 0);
  const totalBallotVotes = players.reduce((sum, p) => sum + (p.ballotVotes || 0), 0);

  const eligibleBallotVotersCount = alivePlayersList.filter(p => {
    if (p.isBallot && p.fazione !== 'Città') return false;
    return true;
  }).length;

  return (
    <div className="dashboard-container">
      
      <div className="header-container">
        <h2>Wherewolf - Master Dashboard</h2>
        <div className="button-group">
          <button className={`btn ${gameStarted ? 'btn-stop' : 'btn-start'}`} onClick={() => setGameStarted(!gameStarted)}>
            {gameStarted ? 'Ferma Partita' : 'Avvia Partita'}
          </button>
          <button className="btn btn-day" onClick={resetAllVotes}>Nuovo Giorno</button>
          <button className="btn btn-danger" onClick={resetEntireGame}>Nuova Partita</button>
          <a href="/Regolamento WhereWolf.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-link">Manuale</a>
        </div>
      </div>

      {victoryStatus && (
        <div className="victory-banner" style={{ backgroundColor: victoryStatus.winner === 'Villaggio' ? '#1e4620' : '#4a1515', border: `2px solid ${victoryStatus.winner === 'Villaggio' ? '#2ecc71' : '#e74c3c'}` }}>
          <h2 style={{ margin: '0 0 10px 0', color: 'white' }}>VITTORIA: {victoryStatus.winner.toUpperCase()}!</h2>
          <p style={{ margin: 0, fontSize: '18px', color: '#ddd' }}>{victoryStatus.message}</p>
        </div>
      )}

      {!gameStarted && (
        <div className="form-container">
          <h3 style={{ marginTop: 0, color: '#ecf0f1' }}>Aggiungi Giocatori alla Stanza</h3>
          <form className="add-form" onSubmit={handleMasterAdd}>
            <input className="dark-input" type="text" placeholder="Nome giocatore" value={masterName} onChange={(e) => setMasterName(e.target.value)} required style={{ flex: 1 }}/>
            <input className="dark-input" list="role-suggestions" placeholder="Cerca ruolo..." value={masterRole} onChange={(e) => setMasterRole(e.target.value)} required style={{ flex: 1 }}/>
            <datalist id="role-suggestions">{sortedRoles.map(r => <option key={r} value={r} />)}</datalist>
            <button type="submit" className="btn btn-link" style={{ flex: '0 0 auto' }}>Aggiungi</button>
          </form>
        </div>
      )}

      <div className="mobile-stats">
        <div style={{ color: '#f39c12', marginBottom: '5px' }}>
          <strong>Voti Giorno Totali:</strong> {totalDayVotes}/{aliveCount}
        </div>
        <div style={{ color: '#e74c3c' }}>
          <strong>Voti Ballottaggio Totali:</strong> {totalBallotVotes}/{eligibleBallotVotersCount}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="game-table">
          <colgroup>
            <col style={{ width: '12%' }} /> 
            <col style={{ width: '13%' }} /> 
            <col style={{ width: '6%' }} />  
            <col style={{ width: '14%' }} /> 
            <col style={{ width: '15%' }} /> {/* Ridotta leggermente per far spazio ai badge */}
            <col style={{ width: '11%' }} /> 
            <col style={{ width: '12%' }} /> 
            <col style={{ width: '9%' }} />  {/* Allargata per il badge MORTO */}
            <col style={{ width: '8%' }} />  {/* Allargata per il tasto azione */}
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Nome</th>
              <th>Ruolo</th>
              <th>Mistico</th>
              <th>Fazione & Aura</th>
              <th>Note</th>
              <th>Voti<br/><span style={{ color: '#f39c12' }}>({totalDayVotes}/{aliveCount})</span></th>
              <th style={{ backgroundColor: '#c0392b' }}>Ballottaggio<br/><span style={{ color: '#fdf3e7' }}>({totalBallotVotes}/{eligibleBallotVotersCount})</span></th>
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
                  
                  <td data-label="Nome" style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '1.1em' }}>
                    {p.name}
                  </td>
                  
                  <td data-label="Ruolo">
                    {p.role}
                  </td>
                  
                  <td data-label="Mistico" style={{ fontWeight: 'bold', color: roleInfo.misticismo === 'Sì' ? '#9b59b6' : '#7f8c8d' }}>
                    {roleInfo.misticismo || 'No'}
                  </td>
                  
                  <td data-label="Fazione & Aura">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <select className="dark-input" style={{ width: '100%', maxWidth: '140px', padding: '4px', marginBottom: '4px' }} value={p.fazione || roleInfo.fazione} onChange={(e) => updateField(p.id, 'fazione', e.target.value)}>
                        {FAZIONI_POSSIBILI.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <span style={{ fontSize: '0.85em', color: '#aaa' }}>(Aura: {currentAura})</span>
                    </div>
                  </td>
                  
                  <td data-label="Note">
                    <input className="dark-input" type="text" defaultValue={p.notes || ''} onBlur={(e) => updateField(p.id, 'notes', e.target.value)} placeholder="..." style={{ width: '100%', padding: '6px' }} />
                  </td>
                  
                  <td data-label="Voti">
                    {!isDead && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <button className="action-btn" onClick={() => decrementVote(p.id, p.votes, 'votes')}>-</button>
                        <span style={{ fontSize: '1.2em', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{p.votes || 0}</span>
                        <button className="action-btn" onClick={() => incrementVote(p.id, p.votes, 'votes')}>+</button>
                      </div>
                    )}
                  </td>
                  
                  <td data-label="Ballottaggio" style={{ borderLeft: '2px solid #c0392b' }}>
                    {!isDead && (
                      <div className="ballot-wrapper">
                        <label style={{ fontSize: '0.85em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                          <input type="checkbox" style={{ transform: 'scale(1.2)' }} checked={p.isBallot || false} onChange={(e) => updateField(p.id, 'isBallot', e.target.checked)} />
                          Ballottante
                        </label>
                        {p.isBallot && (
                           <div className="ballot-controls" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                             <button className="action-btn" onClick={() => decrementVote(p.id, p.ballotVotes, 'ballotVotes')}>-</button>
                             <span style={{ fontSize: '1.2em', fontWeight: 'bold', minWidth: '20px', textAlign: 'center', color: '#e74c3c' }}>{p.ballotVotes || 0}</span>
                             <button className="action-btn" onClick={() => incrementVote(p.id, p.ballotVotes, 'ballotVotes')}>+</button>
                           </div>
                        )}
                      </div>
                    )}
                  </td>
                  
                  <td data-label="Stato">
                    <span className={`status-badge ${isDead ? 'status-morto' : 'status-vivo'}`}>
                      {isDead ? 'Morto' : 'Vivo'}
                    </span>
                  </td>
                  
                  <td data-label="Azioni">
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                      {gameStarted ? (
                        <button onClick={() => toggleStatus(p.id, p.status)} className="action-btn" title={isDead ? "Resuscita" : "Uccidi"}>
                          {isDead ? '💖' : '💀'}
                        </button>
                      ) : (
                        <button onClick={() => removePlayer(p.id)} className="action-btn" style={{ borderColor: 'transparent', background: 'transparent' }} title="Elimina Giocatore">
                          🗑️
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
    </div>
  );
}

export default App;