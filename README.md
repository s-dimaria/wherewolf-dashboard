# 🐺 Wherewolf - Master Dashboard

Una web app interattiva di altissimo livello progettata per i Master di **Wherewolf (Revised Edition - Christian Zoli - Raven ed.)**. Questo strumento sostituisce completamente i blocchi di carta tradizionali, introducendo un ecosistema digitale multi-stanza sincronizzato in tempo reale, ottimizzato sia per l'uso desktop che per la regia rapida da smartphone.

---

## ✨ Funzionalità Principali

* **Multi-Stanza & Co-Mastering in Tempo Reale:** Abbandonato il concetto di database singolo. La dashboard genera lobby isolate tramite codici univoci a 5 cifre (es. `X7B9K`). Collegando più dispositivi allo stesso URL, le modifiche (voti, inserimenti, timer) si sincronizzano istantaneamente sui display di tutti i Master connessi.
* **Gestione Espansioni:** Supporto nativo per 4 modalità di gioco ufficiali (*Una Luna, Una + Due Lune, Darkest Night, Cappuccetto Rosso*). Scegliendo la modalità, il dizionario dei ruoli e i PDF dei manuali si adattano dinamicamente per evitare confusione durante l'inserimento.
* **La Cantilena Dinamica:** Un pop-up dedicato alla *Fase Notturna*. Genera automaticamente l'ordine corretto in cui chiamare i ruoli in base all'espansione selezionata, dividendo perfettamente "La Prima Notte" dalle "Notti Successive".
* **Interfaccia Mobile:** Rivoluzione UX per smartphone. La tabella si trasforma in un mazzo di "carte giocatore", e tutti i controlli si spostano su una Bottom Navigation Bar ancorata sul fondo, con effetto vetro satinato, per un utilizzo a un solo pollice. 
* **Situazione al Tavolo (Floating Status):** Tramite la Bottom Bar mobile, puoi richiamare istantaneamente una lista pulita di tutti i Vivi e i Morti, ordinata rigorosamente in base a come i giocatori sono seduti al tavolo (ordine cronologico di inserimento).
* **Storico Dettagliato:** Tracciamento avanzato e storicizzato di tutti i voti giorno per giorno (Giorno 1, Giorno 2, ecc.), ora comprensivo di Ruolo del giocatore associato al nome.
* **Smart Role Search:** Autocompletamento alfabetico dei ruoli per configurare la partita in pochi secondi.
* **Gestione Avanzata Voti:** Contatori separati e incrementali per i voti base e quelli di Ballottaggio.
* **Misticismo & Fazioni:** Modifica in tempo reale la fazione di un giocatore (es. morso dal Vampiro). L'aura si oscurerà dinamicamente pur mantenendo invariato il suo misticismo originale.
* **Motore di Vittoria Elettronico:** Un algoritmo monitora silenziosamente il bilanciamento. Appena una Fazione (Uomini, Lupi del Branco, Vampiri, ecc.) raggiunge i criteri di vittoria, un pop-up intercetta il risultato.

---

## 🛠️ Stack Tecnologico

*   **Frontend:** React (Vite) - Interfaccia flessibile e aggiornamenti di stato fulminei.
*   **Database:** Firebase Firestore - Database NoSQL in tempo reale per mantenere i dati sincronizzati su ogni schermo.
*   **CI/CD Pipeline:** GitHub Actions + Firebase Hosting - Deploy automatico e immediato dell'applicazione a ogni comando `git push`.

---

## 📁 Struttura dei File Chiave

```text
wherewolf-app/
├── .github/workflows/         # Script di automazione per il deploy su Firebase
├── public/
│   ├── Revised.pdf            # Manuale Principale
│   ├── Darkest Night.pdf      # Manuale Darkest Night
│   ├── Red Riding Hood.pdf    # Manuale Cappuccetto Rosso
│   └── logo.png               # Immagine di copertina
├── src/
│   ├── App.jsx                # Core logico: UI, Firebase Sync, Gestione Stanze
│   ├── firebase.js            # Chiavi e Inizializzazione DB Firestore
│   ├── roles.js               # Dizionario DB completo di espansioni
│   └── App.css                # Stile Dark UI, Modals e Responsive Mobile
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