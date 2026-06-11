# 🐺 Wherewolf - Master Dashboard

Una splendida web app interattiva e reattiva progettata per i Master di **Wherewolf (Revised Edition - Christian Zoli - Raven ed.)**. Questo strumento sostituisce completamente i blocchi di carta tradizionali, automatizzando il tracciamento dei ruoli, delle aure, dei voti e delle condizioni di vittoria in tempo reale.

---

## ✨ Funzionalità Principali

*   **100% Centralizzata per il Master:** Nessuna interazione richiesta sui telefoni dei giocatori. Il Master controlla l'intero ecosistema dal proprio tablet o smartphone.
*   **Smart Role Search:** Barra di inserimento dei giocatori con sistema di autocompletamento stile Google (basato su datalist alfabetico) per una configurazione fulminea della stanza.
*   **Gestione Fase Diurna & Ballottaggio:** Contatori incrementali separati per i voti di accusa diurni e per i voti caldi del ballottaggio. Pulsante di reset rapido per passare al giorno successivo.
*   **Colonna Misticismo:** Una colonna dedicata che indica chiaramente ("Sì" o "No") i ruoli classificati come Mistici dal regolamento, per gestire rapidamente i risvegli criminali (es. Assassino).
*   **Fazione Dinamica & Aura Adattiva:** Menu a tendina per sovrascrivere la fazione di un giocatore in tempo reale (in caso di vampirizzazione o legami d'amore). L'Aura (Chiara/Oscura) si adatta dinamicamente alla nuova fazione selezionata.
*   **Motore di Vittoria Real-Time:** Algoritmo automatico basato sulle regole ufficiali del manuale. Monitora la parità numerica dei Lupi o delle Progenie e la totale epurazione dell'Ombra, attivando banner di game-over istantanei.
*   **Manuale Integrato:** Collegamento rapido nell'header per consultare il PDF del regolamento ufficiale in qualsiasi momento direttamente dalla dashboard.

---

## 🛠️ Stack Tecnologico

*   **Frontend:** React (Vite) - Interfaccia flessibile e aggiornamenti di stato fulminei.
*   **Database:** Firebase Firestore - Database NoSQL in tempo reale per mantenere i dati sincronizzati su ogni schermo.
*   **CI/CD Pipeline:** GitHub Actions + Firebase Hosting - Deploy automatico e immediato dell'applicazione a ogni comando `git push`.

---

## 📁 Struttura dei File Chiave

```text
wherewolf-app/
├── .github/workflows/     # Script di automazione per il deploy su Firebase
├── public/
│   └── Regolamento WhereWolf.pdf  # Il manuale ufficiale accessibile online
├── src/
│   ├── App.jsx            # Core logico, motore di vittoria e interfaccia Master
│   ├── firebase.js        # Inizializzazione ed esportazione del DB Firestore
│   ├── roles.js           # Il dizionario ufficiale dei ruoli con Fazioni, Aure e Misticismo
│   └── App.css            # Stili grafici della dashboard
```

## 🚀 Sviluppo Locale
**Prerequisiti**
Assicurati di avere installato Node.js e NPM sul tuo PC tramite Node Version Manager (NVM).

1. **Installa le dipendenze locali:**

```text
    npm install
```
2.  **Avvia il server di sviluppo:**
```text
    npm run dev
```
3.  **Apri il tuo browser su [http://localhost:5173](http://localhost:5173) per testare l'app.**

---

## 🛰️ Deploy in Produzione (Automazione CI/CD)

Grazie al workflow configurato con GitHub Actions, non hai bisogno di compilare l'applicazione manualmente dal tuo computer. 
Ogni volta che completi una feature o una modifica grafica, ti basta lanciare i classici comandi Git dal tuo terminale:

```text
git add .
git commit -m "Aggiunta nuova feature grafica o logica"
git push origin main
```
Il server di GitHub intercetterà il comando, eseguirà la build ottimizzata e aggiornerà l'applicazione live su Firebase Hosting in meno di un minuto.