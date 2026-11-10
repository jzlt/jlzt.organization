let allDataCache = [];
let SQL = null;
async function getSqlEngine() {
	if (!SQL) SQL = await initSqlJs({ locateFile: f => `./sql/${f}` });
	return SQL;
}

async function loadEntriesFromDb() {
	const engine = await getSqlEngine();
	const res = await fetch('https://jlzt-39e15.web.app/public.db');
	if (!res.ok) throw new Error(`HTTP error! ${res.status}`);
	const buf = await res.arrayBuffer();
	const db = new engine.Database(new Uint8Array(buf));

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

function resolveEscapeBlocks(html) {
  return html.replace(/\[\[([\s\S]*?)\]\]/g, (_, inner) => {
    return inner
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g,  '<')
      .replace(/&gt;/g,  '>')
      .replace(/&nbsp;/g, ' ');
  }).replace(/\/sb\//g, ' ');;
};

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
	contentDiv.innerHTML = resolveEscapeBlocks(entry.content);
	div.appendChild(contentDiv);

	const tagsP = document.createElement('p');
	tagsP.className = 'tags';
	tagsP.textContent = entry.tags.map(tag => "#" + tag).join(' ');
	div.appendChild(tagsP);

	return div;
}

function populateContainer(entries) {
	const container = document.getElementById("container")

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

const verbs = ["is idling around", "is not playing games", "is working on coding", "is coding on working", "is getting MAD", "is eating food", "is trying to get inspired", "is staring at wall"];
(function main() {
	console.log("running");
	document.getElementById("entry-0").remove();
	document.getElementById("initiate").addEventListener("click", () => {
		document.getElementById("entry-1").remove();
		setTimeout(()=>{
			displayer();
			exitbuttoner();
		}, 10)
	});

	document.getElementById("verb").innerHTML = verbs[Math.floor(Math.random()*verbs.length)];
	document.getElementById("jlzt").addEventListener("click", () => {
		document.getElementById("verb").innerHTML = verbs[Math.floor(Math.random()*verbs.length)];
	});
})();
