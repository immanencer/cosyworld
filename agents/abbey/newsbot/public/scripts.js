document.addEventListener('DOMContentLoaded', () => {
    fetch('/news/articles.json')
        .then(response => response.json())
        .then(data => {
            const newsContainer = document.getElementById('news-container');
            data.forEach(item => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';

                const title = document.createElement('h2');
                const link = document.createElement('a');
                link.href = item.link;
                link.textContent = item.title;
                link.target = '_blank';
                title.appendChild(link);

                const pubDate = document.createElement('p');
                pubDate.textContent = `Published on: ${new Date(item.pubDate).toLocaleDateString()}`;

                const summary = document.createElement('div');
                summary.innerHTML = marked(item.summary);

                newsItem.appendChild(title);
                newsItem.appendChild(pubDate);
                newsItem.appendChild(summary);

                newsContainer.appendChild(newsItem);
            });
        })
        .catch(error => console.error('Error fetching news:', error));
});
