let allDataCache = [];
let SQL = null;
const container = document.getElementById("container")

async function getSqlEngine() {
	if (!SQL) SQL = await initSqlJs({ locateFile: f => `./sql/${f}` });
	return SQL;
}

async function loadEntriesFromDb() {
	const engine = await getSqlEngine();
	let db
	try {
		const res = await fetch('https://jlzt-39e15.web.app/public.db');
		if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
		const buf = await res.arrayBuffer();
		db = new engine.Database(new Uint8Array(buf));
	} catch (err) {
		container.appendChild(createContent(
			{"title":"error",
			"content":"failed to fetch database, uh oh! Maybe it's my problem, idk...",
			"tags":["error", "problems", "HALP"]
			}, "ERROR"));

		console.error('db load failed:', err);
        return null;
	}

	const notesStmt = db.prepare('SELECT id, title, content, created_date FROM notes ORDER BY id DESC');
	const notes = [];
	while (notesStmt.step()) notes.push(notesStmt.getAsObject());
	notesStmt.free();

	const tagsStmt = db.prepare('SELECT note_id, tag FROM note_tags');
	const tagsByNote = new Map();
	while (tagsStmt.step()) {
		const row = tagsStmt.getAsObject();
		if (!tagsByNote.has(row.note_id)) tagsByNote.set(row.note_id, []);
		tagsByNote.get(row.note_id).push(row.tag);
	};
	tagsStmt.free();

	notes.forEach(n => { n.tags = tagsByNote.get(n.id) || []; });

	db.close();
	return notes;
}

const PUBLIC_HOSTS = ['jlzt-39e15.web.app', 'jlzt-39e15.firebaseapp.com']; // add jlzt.org if it points at the deploy
const DEFAULT_MODE = PUBLIC_HOSTS.includes(location.hostname) ? 'public' : 'local';

function localizePublicPaths(html) {
  return html.replace(/<[a-z][^>]*>/gi, tag =>
    HAS_PUBLIC_CLASS.test(tag)
      ? tag.replace(ROOT_REL_ATTR, (_, pre) => pre + LOCAL_PUBLIC_ROOT + '/')
      : tag
  );
};

function resolveEscapeBlocks(html, mode = DEFAULT_MODE) {
  html = html.replace(/\/sb\//g, ' ');
  return html.replace(/\[\[([\s\S]*?)\]\]/g, (_, inner) => {
    const out = inner
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g,  '<')
      .replace(/&gt;/g,  '>')
      .replace(/&nbsp;/g, ' ');
    return mode === 'local' ? localizePublicPaths(out) : out;
  });
}

function createContent(entry, idx) {
	const div = document.createElement('div');
	div.className = 'box';
	div.id = `entry-${idx}`;

	const idLabel = document.createElement('div');
	idLabel.className = 'entry-id-label closeContent';
	idLabel.textContent = entry.id ?? idx;
	div.appendChild(idLabel);

	const titleDiv = document.createElement('div');
	titleDiv.className = 'title';
	titleDiv.style = 'display: block; width: 100%;';
	titleDiv.innerHTML = `<p>${entry.title}</p>`;
	div.appendChild(titleDiv);

	const contentDiv = document.createElement('div');
	contentDiv.className = 'content';
	contentDiv.innerHTML = resolveEscapeBlocks(entry.content, "public");
	div.appendChild(contentDiv);

	const tagsP = document.createElement('p');
	tagsP.className = 'tags';
	tagsP.textContent = entry.tags.map(tag => "#" + tag).join(' ');
	div.appendChild(tagsP);

	return div;
}

function populateContainer(entries) {
	Array.from(container.children).forEach(child => {
		if (!keepIds.includes(child.id)) child.remove();
	});

	entries.forEach((entry, idx) => {
		container.appendChild(createContent(entry, idx));
	});
}

async function displayer() {
	try {
		allDataCache = await loadEntriesFromDb();
		populateContainer(allDataCache);
	} catch (err) {
		console.error(err);
	}
};

function exitbuttoner() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".closeContent");
        if (!btn) return;

        const entry = btn.classList.contains("entry-id-label") ? btn.parentElement : btn.parentElement.parentElement;

        const content = entry?.querySelector(".content");
        if (!content) return;

        content.style.display = getComputedStyle(content).display === "none" ? "block" : "none";
    });
}

async function loadTextToArray(fileUrl, arg) {
	const response = await fetch(fileUrl);
	if (!response.ok) throw new Error(`${fileUrl}: ${response.status}`);
	const text = await response.text();
	return (arg === "skull") ? text : text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
}

async function embellishment() {
	let skull;
	try {skull = await loadTextToArray("funny.txt", "skull");} catch (error) {console.error("Error loading file:", error); return};
	console.log(skull);
	console.log("What are you looking for?")
}

(async function main() {
	document.getElementById("entry-0").remove();
	document.getElementById("initiate").addEventListener("click", () => {
		document.getElementById("entry-1").remove();
		setTimeout(()=>{
			displayer();
			exitbuttoner();
		}, 10)
	});

	let verbs;
	try {verbs = await loadTextToArray("verbs.txt", "nah");} catch (error) {console.error("Error loading file:", error); return};
	const randomVerb = () => {return verbs[Math.floor(Math.random() * verbs.length)]};
	
	document.getElementById("verb").innerHTML = randomVerb();
	document.getElementById("jlzt").addEventListener("click", async () => {
		document.getElementById("verb").innerHTML = randomVerb();
	});
	embellishment();
})();
