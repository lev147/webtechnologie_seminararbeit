document.getElementById('complex-form').addEventListener('submit', function(event) {
    event.preventDefault();
    alert('Formular wurde abgeschickt');
});

document.querySelectorAll('.delete-row').forEach(button => {
    button.addEventListener('click', function() {
        this.closest('tr').remove();
    });
});

document.getElementById('add-row').addEventListener('click', function() {
    const table = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    newRow.innerHTML = `
        <td>Neuer Benutzer</td>
        <td>30</td>
        <td>newuser@example.com</td>
        <td><button class="delete-row">Löschen</button></td>
    `;
    newRow.querySelector('.delete-row').addEventListener('click', function() {
        this.closest('tr').remove();
    });
});

document.getElementById('load-content').addEventListener('click', function() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '<p>Dieser Inhalt wurde dynamisch geladen.</p>';
});
