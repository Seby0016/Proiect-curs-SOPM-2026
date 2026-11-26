# Yagi Tasks — aplicația web (React)

Proiect SOPM · Echipa Yagi · Livrabilul 2: implementare React + documentație.

Aplicație de management ierarhic al activităților: fiecare angajat vede activitățile postului și departamentului său, managerii monitorizează echipa, iar regula de abateri (3 restanțe = 1 abatere, a 3-a abatere = concediere) rulează automat.

## Pornire rapidă

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # testele logicii de business (node:test)
npm run build    # build de producție în dist/
```

Cerințe: Node.js 20+.

## Conturi

Fiecare persoană are cont propriu: `prenume.nume@yagi.ro`. Parola pentru toate conturile demo e `yagi2026`. Pe ecranul de autentificare, un clic pe un cont îi completează datele. Contul concediat (Victor Lazăr) e refuzat la login. Parola se schimbă din profil (clic pe numele tău → „Contul meu”).

## Cum faci demo-ul la ședință (4 minute)

1. **Tab 1, Andreea Popescu (angajat).** Bifa de pe o activitate primită nu o închide, ci o **trimite spre validare** șefului. „Restant” nu îl poate pune nimeni manual, doar sistemul la expirarea termenului.
2. **Tab 2, Yanis Sarca (manager).** Pe panou apare „De validat”: **Validează** (activitatea devine Complet și angajatul primește punctele) sau **Respinge** cu motiv. În tab-ul Andreei se vede instant.
3. Pagina **Evaluare**: punctele duc la un calificativ trimestrial, iar calificativul decide bonusul, promovarea sau planul de îmbunătățire. Yanis o propune pe Andreea la Senior. Intră ca **Sebastian** (director) și aprobă.
4. Regula de abateri: în tab-ul lui Yanis, **Mașina Timpului → +1 zi**. Radu primește a 3-a abatere, iar în tab-ul lui apare ștampila **CONCEDIAT**.
5. Date noi pentru o altă demonstrație: **Posturi → Resetează datele demo**.

## Structura proiectului

```
src/
  logic/        logica de business pură (testată): statusuri, abateri, puncte și calificative, permisiuni, parser
  data/seed.js  firma demo „Yagi Systems”: departamente, posturi, angajați, proiecte, activități
  store/        stare globală, persistență localStorage, sincronizare BroadcastChannel
  components/   componente UI reutilizabile (TaskCard, TaskDrawer, Mașina Timpului, Ctrl+K…)
  pages/        Login, Panou, Activități, Proiecte, Kanban, Echipă, Dosar angajat, Evaluare, Posturi
tests/          teste pentru regula de abateri, parser și permisiuni
```

Fără instalare: deschide `demo/yagi-tasks-demo.html` direct în Chrome.

Documentația completă: [DOCUMENTATIE.md](./DOCUMENTATIE.md).
