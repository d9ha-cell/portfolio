console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact' },
    { url: 'resume/', title: 'Resume' },
    { url: 'https://github.com/d9ha-cell', title: 'GitHub' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH =(location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '/'
    : '/portfolio/';

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if(!url.startsWith('http')) {
        url = BASE_PATH + url;
    }

    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);

    if (a.host === location.host && a.pathname === location.pathname)
    {a.classList.add('current');}

    if (a.host !== location.host){
        a.target = '_blank';
    }

}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="light dark">Automatic<</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
		</select>
	</label>
    `
);

let select = document.querySelector('.color-scheme select');

select.addEventListener('input', function(event) {document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
});

if ('colorScheme' in localStorage) 
    {
        document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
        select.value = localStorage.colorScheme;}


let form = document.querySelector('form');

form?.addEventListener('submit', function(event) {
    event.preventDefault();

    let data = new FormData(form);
    
    let url = form.action + '?';

    for (let [name, value] of data) {

        url += `${name}=${encodeURIComponent(value)}&`;

    }

    console.log(url);
    location.href = url;

});

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    if (!response.ok){
        throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}


export function renderProjects(projects, containerElement, headingLevel = 'h2') {

    containerElement.innerHTML = '';

    for (let pro of projects) {

        const article = document.createElement('article');

        article.innerHTML = `
            <${headingLevel}>${pro.title}</${headingLevel}>
            <img src ="${pro.image}" alt="${pro.title}">
            <p>${pro.description}</p>
            `;

        containerElement.appendChild(article);
    }
}

export async function fetchGithubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}
