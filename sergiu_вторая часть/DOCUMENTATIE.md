# Documentație tehnică — Yagi Tasks (aplicația web React)

**Proiect:** Sisteme de Operare pentru Platforme Mobile (SOPM) · **Echipa:** Yagi
**Livrabile:** 2 — Implementare React; documentație (Ședința 4) · 3 — Implementare React Native; documentație (Ședința 6)

| Membru | Rol | Contribuție în aplicația web |
|---|---|---|
| Iordache Sebastian | Team Manager & Design UI/UX | Coordonare, identitatea vizuală Bauhaus, sistemul de forme pentru statusuri, animații |
| Iordache Decebal | Interfață Web & Componente React | Pagini, componente (TaskCard, Kanban, sertar de detalii, paleta Ctrl+K) |
| Sarca Yanis | Bază de date & Arhitectură | Modelul de date, ierarhia, motorul de evaluare a abaterilor |
| Simin Sergiu | Integrări API & Testare | Store, sincronizarea în timp real, testele automate și scenariile speciale |

---

## 1. Prezentare generală

Yagi Tasks este o platformă ierarhică pentru organizarea activităților, evaluarea performanței și monitorizarea echipei. Aplicația web este realizată în **React 19** și rulează integral în browser. Datele sunt păstrate local, iar tab-urile deschise se sincronizează în timp real.

## 2. Cerințe minimale (tema proiectului)

| Cerință | Implementare |
|---|---|
| Conturi și autentificare | Fiecare utilizator are cont propriu (`prenume.nume@yagi.ro` + parolă). Parola se păstrează ca hash, poate fi schimbată din profil, iar contul concediat e refuzat la login |
| Adăugare activități | Formular „Activitate nouă” (tasta `N`), bara de adăugare rapidă în limbaj natural, paleta `Ctrl+K` |
| Eliminare activități | „Șterge activitatea” cu confirmare: creatorul sau superiorul ierarhic (§5) |
| **Upcoming – Urmează** | Starea la atribuire. Include sub-starea „în validare” |
| **Overdue – Restant** | Pus **doar de sistem**, când termenul expiră. Nimeni nu îl poate seta manual |
| **Completed – Complet** | Doar după **validarea** superiorului (fluxul de la §3) |
| **Canceled – Anulat** | De superiorul ierarhic care a atribuit activitatea, cu motiv opțional |

Fiecare status are o **formă** proprie, ca să poată fi recunoscut și fără culoare: ● Urmează, ▲ Restant, ■ Complet, ✕ Anulat.
În detaliile activității, cele 4 statusuri apar ca un traseu care arată unde se află activitatea și cine o mută mai departe.

## 3. Fluxul de lucru (cum ajunge o activitate „Complet”)

Ca în prezentare („sarcini finalizate de angajat, **validate** în panoul de monitorizare”), angajatul nu își poate închide singur o activitate primită:

```
Urmează ──(angajatul: „Trimite spre validare”)──► Urmează · în validare ──(superiorul: „Validează”)──► Complet (+PP)
   │                                                     └──(superiorul: „Respinge” + motiv)──► înapoi la angajat
   ├──(termenul expiră, automat)──► Restant (rămâne contorizat în dosar)
   └──(superiorul: „Anulează”)──► Anulat
```

- Trimiterea spre validare cere ca toți pașii (checklist-ul) să fie bifați.
- Validează cel care a atribuit activitatea. Dacă și-a pus-o singur (de exemplu într-un proiect), validează liderul proiectului sau managerul lui.
- Cât timp așteaptă validarea, activitatea **nu devine restantă**: angajatul a predat la timp, iar întârzierea șefului nu e vina lui.
- Respingerea cere un motiv. Activitatea se întoarce la angajat cu același termen, deci poate deveni restantă.
- Superiorul poate **redeschide** o activitate validată. Punctele acordate se retrag.
- **Activitățile personale** (create de angajat pentru el însuși, în afara unui proiect) se bifează direct, nu se validează, nu aduc puncte și nu intră în dosarul de abateri.
- Pe Kanban, tragerea unui card în „Complet” face pasul potrivit rolului: angajatul îl predă, superiorul îl validează. Tragerea în „Restant” e refuzată cu explicație.

## 4. Cerințe suplimentare (minimum 3)

1. **Posturi predefinite.** Fiecare post (Director, Manager Inginerie, Inginer Software, Inginer QA, Designer UI/UX…) are permisiuni și o fișă a postului. La angajare, activitățile din fișă se atribuie automat (pagina *Posturi*).
2. **Proiecte de inginerie în grup.** Spațiu comun cu membri, activități cu mai mulți asignați, tablă Kanban, flux de activitate, prezență „online acum”, sincronizare în timp real.
3. **Regula de abateri și concediere** (§5).
4. **Ierarhie, validare și evaluare.** Organigramă, vizibilitate pe departament, validarea muncii de către superior, evaluare trimestrială cu consecințe (§6).

### Funcții extra

- **Mașina Timpului** (tasta `T`, pentru manageri). Avansează ceasul aplicației ca să se vadă live cum expiră termenele și cum se aplică regula de abateri, cu un radar al activităților care ar declanșa o abatere sau o concediere.
- **Adăugare rapidă în limbaj natural.** `Raport sprint mâine la 15 !mare #raport @Andreea`
- **Paleta de comenzi `Ctrl+K`**, notificări în aplicație, temă luminoasă/întunecată, design responsive.

## 5. Regula de business: abateri și concediere

Implementată ca funcție pură în `src/logic/rules.js → evaluate(state, now)`. Rulează după fiecare acțiune, la 15 secunde și la fiecare salt al Mașinii Timpului.

1. Fiecare activitate de serviciu care devine restantă primește marcajul `overdueAt` și crește contorul `restante` al fiecărui asignat activ. Se contorizează **o singură dată**, chiar dacă e predată ulterior.
2. Fiecare serie de **3 restanțe** = o **abatere** în dosar și **−50 puncte de performanță**. Abaterea blochează bonusul în trimestrul curent.
3. La abaterile 1 și 2 se creează automat **2 activități de penalizare**, cu termen la sfârșitul săptămânii și prioritate ridicată. Se validează de manager, nu aduc puncte și nu pot fi șterse sau anulate de cel penalizat.
4. La **a 3-a abatere** contul e marcat `concediat`: utilizatorul e deconectat (și în alte tab-uri) și nu se mai poate autentifica. Directorul îl poate reactiva, iar contorul se resetează.

Funcția este **idempotentă**: rulată de două ori la același moment nu produce evenimente noi. Proprietatea e verificată prin teste.

## 6. Evaluare trimestrială: ce înseamnă punctele

Punctele de performanță (**PP**) nu sunt un joc. Sunt baza evaluării de la final de trimestru, iar evaluarea are urmări concrete în firmă.

| Prioritate | Predat la timp (×1,5) | Predat cu întârziere (×0,25) |
|---|---|---|
| Scăzută | +15 | +3 |
| Medie | +30 | +5 |
| Ridicată | +53 | +9 |
| Critică | +75 | +13 |

Abatere: −50 PP. Activitate personală sau de penalizare: 0 PP. Punctele se acordă **doar la validare**, iar la activitățile de grup fiecare membru primește punctele întregi.

**Scorul de livrare** (0–100) = rata de livrare la timp − 10 puncte pentru fiecare abatere.

| Calificativ | Condiție (fără abateri în trimestru) | Consecință |
|---|---|---|
| Excepțional | scor ≥ 90 și ≥ 350 PP | Bonus 15% + eligibil pentru promovare |
| Peste așteptări | scor ≥ 75 și ≥ 200 PP | Bonus 8% din salariul de bază |
| Conform așteptărilor | scor ≥ 55 | Fără bonus |
| Sub așteptări | sub praguri sau cu abateri | Plan de îmbunătățire a performanței (PIP) |

**Promovare:** grade Junior → Mid → Senior → Principal. Managerul propune promovarea unui subordonat cu calificativ *Excepțional*, iar directorul o aprobă sau o respinge. Gradul nou apare în profil și în dosar.
**Confidențialitate:** angajatul își vede doar propria evaluare. Managerul o vede pe a echipei lui, directorul pe a tuturor.

## 7. Roluri și permisiuni

| Permisiune | Director | Manager | Angajat |
|---|:-:|:-:|:-:|
| Vede activitățile proprii și ale departamentului | ✓ | ✓ | ✓ |
| Atribuie activități subordonaților | ✓ (tuturor) | ✓ | — |
| Validează / respinge activitățile predate | ✓ | ✓ (ce a atribuit, echipa lui) | — |
| Anulează activități | ✓ | ✓ | doar pe cele personale |
| Propune promovări | ✓ | ✓ | — |
| Aprobă promovări | ✓ | — | — |
| Panou de monitorizare a echipei | ✓ | ✓ | — |
| Creează proiecte de grup | ✓ | ✓ | — |
| Mașina Timpului | ✓ | ✓ | — |
| Posturi și angajări, reactivare conturi | ✓ | — | — |

Permisiunile țin de **post**, nu de persoană, și se pot modifica din pagina *Posturi*.
Ștergere: creatorul își poate șterge activitățile. Superiorul poate șterge activitățile subordonaților. Activitățile de penalizare nu pot fi șterse de cel penalizat.

## 8. Arhitectură

```
 UI (pagini + componente React)
        │  dispatch(acțiune)                ▲ useStore() / useSession() / useNow()
        ▼                                   │
 reducer  ──►  evaluate() (regula de abateri)  ──►  commit()
                                                 ├─ localStorage (persistență)
                                                 ├─ BroadcastChannel (sincronizare între tab-uri)
                                                 └─ emitFx (toast, confetti, alerte)
```

- **Store fără biblioteci externe** (`src/store/store.js`): un singur obiect de stare, expus prin `useSyncExternalStore`. Orice modificare trece prin `dispatch()`, deci logica e centralizată și ușor de mutat pe un server.
- **Autentificare** (`src/logic/auth.js`): email + parolă, hash cu sare (emailul). Validare parolă: minim 8 caractere, litere și cifre. Pe server se va folosi bcrypt.
- **Sesiune per tab** (`sessionStorage`): în două tab-uri pot fi autentificați doi utilizatori diferiți, ca să se poată demonstra sincronizarea.
- **Timp virtual:** `state.clockOffset` decalează „acum”-ul aplicației, iar toate funcțiile primesc momentul curent ca parametru.
- **Rutare** pe hash (`#panou`, `#proiect-p1`, `#angajat-u6`), fără bibliotecă.

## 9. Model de date

```ts
User        { id, name, email, positionId, managerId, hue, grade: 1..4, pp, restante, abateri,
              status: 'activ' | 'concediat', firedAt, hiredAt, dosar: DosarEntry[] }
Position    { id, title, departmentId, level: 1|2|3, permissions: string[],
              templates: { title, priority, days }[] }
Department  { id, name, short, hue }
Task        { id, title, description, assigneeIds: string[], createdBy, projectId | null,
              priority: 'low'|'medium'|'high'|'critical',
              status: 'upcoming'|'overdue'|'completed'|'canceled',
              dueDate, createdAt, submittedAt?, validatedBy?, validatedAt?, completedAt?,
              overdueAt?, points?, rejection?: { by, at, reason }, canceledBy?, isPenalty,
              tags: string[], checklist: { id, text, done }[], comments: { id, userId, text, at }[] }
Project     { id, code, name, description, hue, memberIds, leadId, createdAt, deadline }
DosarEntry  { id, at, type: 'angajare'|'abatere'|'penalizare'|'concediere'|'reabilitare'|'promovare', text }
Promotion   { id, userId, by, at, from, to, reason, status: 'pending'|'approved'|'rejected', decidedBy? }
Activity    { id, at, userId | 'system', kind, text, projectId?, taskId? }
Notification{ id, userId, at, kind, text, read }
```

Statusul afișat e calculat de `effectiveStatus(task, now)`. Complet și Anulat sunt finale. Restant apare doar când termenul expiră și activitatea nu a fost predată la timp. Altfel, Urmează.

## 10. Interfață și experiență de utilizare

- **Identitate vizuală Bauhaus:** fundal alb-hârtie, contururi negre groase, culori plate (cobalt, roșu, muștar, negru), fără gradienturi, fonturile Jost și IBM Plex Mono.
- Statusurile sunt codificate prin **formă + culoare** (accesibil și pentru daltoniști).
- Animații: tranziție între pagini cu trei benzi de culoare, formele KPI care se rotesc, compoziția de poster animată pe ecranul de autentificare, confetti geometric, ștampila „Concediat”, cifrele Mașinii Timpului care se răsucesc.
- `prefers-reduced-motion` este respectat: animațiile se opresc pentru cine le-a dezactivat din sistem.
- Navigare completă din tastatură: `Ctrl+K`, `N`, `T`, `Esc`, `Enter` pe carduri.

## 11. Testare

`npm test` rulează 20 de teste (`tests/rules.test.js`, `node:test`):

- statusul efectiv; restanța nu apare cât timp activitatea e la validare;
- 2 restanțe nu produc abatere; 3 restanțe = 1 abatere, 2 penalizări și −50 PP;
- idempotența evaluării; concedierea la a 3-a abatere; conturile concediate nu mai acumulează restanțe;
- o restanță se numără o singură dată; activitățile personale nu intră în dosar;
- punctele de performanță (×1,5 la timp, ×0,25 cu întârziere, 0 la cele personale);
- fluxul de validare: cine validează, cine nu poate valida propria muncă;
- calificativul trimestrial și blocarea bonusului de către abateri;
- autentificarea (parolă corectă/greșită, cont concediat) și generarea conturilor;
- parserul de limbaj natural; consistența datelor demo; scenariul de concediere al lui Radu; permisiunile.

Testare manuală: Chrome (desktop, 1440 px) și emulare de telefon (390 px), în temele luminoasă și întunecată, plus fluxul complet în două tab-uri (Andreea trimite, Yanis validează sau respinge, iar modificarea apare instant la Andreea).

## 12. Pașii următori

- **Ședința 6 — aplicația mobilă (React Native + Expo).** Logica din `src/logic` e JavaScript pur, fără DOM, așa că o refolosim pe telefon: aceleași reguli de abateri, același flux de validare, aceleași conturi.
- Sincronizare web ↔ mobil printr-un server (aceeași stare pe ambele dispozitive).
- Bază de date reală (PostgreSQL) și parole cu bcrypt pe server.
- Regula de abateri rulată pe server (cron), nu doar în browser.
