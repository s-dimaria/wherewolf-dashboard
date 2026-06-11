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

  // --- MOTORE DI VITTORIA ---
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

  // --- FUNZIONI DI GIOCO ---
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

  // Tutte le possibili fazioni per il menu a tendina dinamico
  const FAZIONI_POSSIBILI = ["Villaggio", "Città", "Lupi del Branco", "Criminali", "Amante", "Vampiro", "Inquisizione", "Indipendenti", "Nessuna"];

  // --- CALCOLATORI PER I VOTI ---
  const alivePlayersList = players.filter(p => p.status === 'vivo');
  const aliveCount = alivePlayersList.length;

  const totalDayVotes = players.reduce((sum, p) => sum + (p.votes || 0), 0);
  const totalBallotVotes = players.reduce((sum, p) => sum + (p.ballotVotes || 0), 0);

  // Chi vota al ballottaggio? I vivi, MENO i ballotanti, ECCETTO se sono della Fazione Città.
  const eligibleBallotVotersCount = alivePlayersList.filter(p => {
    if (p.isBallot && p.fazione !== 'Città') return false;
    return true;
  }).length;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Wherewolf - Master Dashboard</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={() => setGameStarted(!gameStarted)} style={{ backgroundColor: gameStarted ? '#e74c3c' : '#2ecc71', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            {gameStarted ? 'Ferma Partita' : 'Avvia Partita'}
          </button>
          <button onClick={resetAllVotes} style={{ backgroundColor: '#f39c12', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Nuovo Giorno
          </button>
          <button onClick={resetEntireGame} style={{ backgroundColor: '#8e44ad', color: 'white', padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
            Nuova Partita
          </button>
          <a 
            href="/Regolamento WhereWolf.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ backgroundColor: '#3498db', color: 'white', padding: '10px 15px', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}
          >
            Manuale
          </a>
        </div>
      </div>

      {victoryStatus && (
        <div style={{ backgroundColor: victoryStatus.winner === 'Villaggio' ? '#d4edda' : '#f8d7da', color: victoryStatus.winner === 'Villaggio' ? '#155724' : '#721c24', padding: '20px', borderRadius: '8px', textAlign: 'center', marginBottom: '20px', border: `2px solid ${victoryStatus.winner === 'Villaggio' ? '#c3e6cb' : '#f5c6cb'}` }}>
          <h2 style={{ margin: '0 0 10px 0' }}>VITTORIA: {victoryStatus.winner.toUpperCase()}!</h2>
          <p style={{ margin: 0, fontSize: '18px' }}>{victoryStatus.message}</p>
        </div>
      )}

      {!gameStarted && (
        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>Aggiungi Giocatori alla Stanza</h3>
          <form onSubmit={handleMasterAdd} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input type="text" placeholder="Nome giocatore" value={masterName} onChange={(e) => setMasterName(e.target.value)} required style={{ padding: '8px', width: '200px' }}/>
            
            {/* Input con ricerca automatica (Datalist HTML5) */}
            <input 
              list="role-suggestions" 
              placeholder="Cerca ruolo..." 
              value={masterRole} 
              onChange={(e) => setMasterRole(e.target.value)} 
              style={{ padding: '8px', width: '250px' }}
              required 
            />
            <datalist id="role-suggestions">
              {sortedRoles.map(r => <option key={r} value={r} />)}
            </datalist>

            <button type="submit" style={{ padding: '8px 15px', cursor: 'pointer' }}>➕ Aggiungi</button>
          </form>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center', background: 'white' }}>
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ textAlign: 'left' }}>Nome</th>
              <th>Ruolo</th>
              <th>Mistico</th>
              <th>Fazione & Aura</th>
              <th>Note Notturne</th>
              
              {/* Contatore Votazione */}
              <th>
                Voti<br/>
                <span style={{ fontSize: '0.8em', color: '#f39c12' }}>
                  ({totalDayVotes} / {aliveCount})
                </span>
              </th>
              
              {/* Contatore Ballottaggio */}
              <th style={{ backgroundColor: '#c0392b' }}>
                Ballottaggio <br/>
                <span style={{ fontSize: '0.8em', color: '#fdf3e7' }}>
                  ({totalBallotVotes} / {eligibleBallotVotersCount})
                </span>
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
              
              return (
                <tr key={p.id} style={{ backgroundColor: isDead ? '#ffeaea' : p.isBallot ? '#fdf3e7' : 'white', opacity: isDead ? 0.7 : 1 }}>
                  
                  <td style={{ textAlign: 'left' }}><strong>{p.name}</strong></td>
                  
                  {/* Nome Ruolo */}
                  <td>{p.role}</td>
                  
                  {/* Colonna Mistico*/}
                  <td style={{ fontWeight: 'bold', color: roleInfo.misticismo === 'Sì' ? '#8e44ad' : '#7f8c8d' }}>
                    {roleInfo.misticismo || 'No'}
                  </td>
                  
                  {/* Select Dinamica per Sovrascrivere la Fazione */}
                  <td style={{ fontSize: '0.9em' }}>
                    <select 
                      value={p.fazione || roleInfo.fazione} 
                      onChange={(e) => updateField(p.id, 'fazione', e.target.value)}
                      style={{ padding: '2px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '5px', width: '130px' }}
                    >
                      {FAZIONI_POSSIBILI.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <br/> <em>(Aura: {currentAura})</em>
                  </td>
                  
                  <td>
                    <input type="text" defaultValue={p.notes || ''} onBlur={(e) => updateField(p.id, 'notes', e.target.value)} placeholder="..." style={{ width: '90%', padding: '5px', border: '1px solid #ccc' }} />
                  </td>

                  <td>
                    {!isDead && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => decrementVote(p.id, p.votes, 'votes')}>-</button>
                        <span style={{ fontSize: '1.2em', fontWeight: 'bold', width: '20px' }}>{p.votes || 0}</span>
                        <button onClick={() => incrementVote(p.id, p.votes, 'votes')}>+</button>
                      </div>
                    )}
                  </td>

                  <td style={{ borderLeft: '2px solid #c0392b' }}>
                    {!isDead && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <label style={{ fontSize: '0.8em', cursor: 'pointer' }}>
                          <input type="checkbox" checked={p.isBallot || false} onChange={(e) => updateField(p.id, 'isBallot', e.target.checked)} /> In Ballottaggio
                        </label>
                        {p.isBallot && (
                           <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '5px' }}>
                             <button onClick={() => decrementVote(p.id, p.ballotVotes, 'ballotVotes')}>-</button>
                             <span style={{ fontSize: '1.2em', fontWeight: 'bold', width: '20px', color: '#c0392b' }}>{p.ballotVotes || 0}</span>
                             <button onClick={() => incrementVote(p.id, p.ballotVotes, 'ballotVotes')}>+</button>
                           </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td style={{ color: isDead ? 'red' : 'green', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.status}</td>
                  
                  <td>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      {gameStarted ? (
                        <button onClick={() => toggleStatus(p.id, p.status)} style={{ cursor: 'pointer', background: 'transparent', border: 'none', fontSize: '1.2em' }} title={isDead ? "Resuscita" : "Uccidi"}>
                          {isDead ? '💖' : '💀'}
                        </button>
                      ) : (
                        <button onClick={() => removePlayer(p.id)} style={{ cursor: 'pointer', background: 'transparent', border: 'none', fontSize: '1.2em' }} title="Elimina Giocatore">
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