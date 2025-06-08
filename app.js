// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const categoryInput = document.getElementById('category');
const amountInput = document.getElementById('amount');
const errorMessage = document.getElementById('error-message');
const transactionList = document.getElementById('transaction-list');
const filterSelect = document.getElementById('filter-category');
const themeToggle = document.getElementById('theme-toggle');

let transactions = [];
let isEditing = false;
let editId = null;
let categoryChartInstance = null;

// Load from localStorage
document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('transactions');
  if (saved) {
    transactions = JSON.parse(saved);
  }

  const savedTheme = localStorage.getItem('darkMode') === 'true';
  if (savedTheme) {
    document.body.classList.add('dark-mode');
    themeToggle.checked = true;
  }

  updateUI(); // Renders UI + chart
});

// Add/Edit Transaction
transactionForm.addEventListener('submit', function (e) {
  e.preventDefault();

  const description = descriptionInput.value.trim();
  const date = dateInput.value;
  const category = categoryInput.value;
  const amount = parseFloat(amountInput.value);

  // Validation
  if (!description || !date || !category || isNaN(amount) || amount <= 0) {
    errorMessage.textContent = "Please fill all fields correctly.";
    return;
  }

  errorMessage.textContent = "";

  if (isEditing) {
    // Update existing transaction
    const txIndex = transactions.findIndex(t => t.id === editId);
    if (txIndex !== -1) {
      transactions[txIndex] = {
        ...transactions[txIndex],
        description,
        date,
        category,
        amount,
        type: category === 'Salary' || category === 'Freelance' ? 'income' : 'expense'
      };
    }
    isEditing = false;
    editId = null;
    document.querySelector("button[type='submit']").textContent = "Add Transaction";
  } else {
    // Add new transaction
    const newTransaction = {
      id: Date.now(),
      description,
      date,
      category,
      amount,
      type: category === 'Salary' || category === 'Freelance' ? 'income' : 'expense'
    };
    transactions.push(newTransaction);
  }

  saveToLocalStorage();
  updateUI();
  transactionForm.reset();
});

// Update UI
function updateUI() {
  const selectedCategory = filterSelect?.value || 'all';

  transactionList.innerHTML = "";
  let totalIncome = 0;
  let totalExpense = 0;

  const filtered = selectedCategory === "all"
    ? transactions
    : transactions.filter(tx => tx.category === selectedCategory);

  filtered.forEach((tx) => {
    const li = document.createElement("li");
    li.className = `transaction ${tx.type}`;
    li.innerHTML = `
      <span>${tx.description} - <small>${tx.category}</small></span>
      <span>₹${tx.amount.toFixed(2)}</span>
      <button class="edit-btn" onclick="editTransaction(${tx.id})">Edit</button>
      <button class="delete-btn" onclick="deleteTransaction(${tx.id})">Delete</button>
    `;
    transactionList.appendChild(li);

    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  });

  document.getElementById('total-income').textContent = `₹${totalIncome.toFixed(2)}`;
  document.getElementById('total-expense').textContent = `₹${totalExpense.toFixed(2)}`;
  document.getElementById('net-balance').textContent = `₹${(totalIncome - totalExpense).toFixed(2)}`;

  renderChart(); // 🔥 Render chart every time UI updates
}

// Delete Transaction
function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveToLocalStorage();
  updateUI();
}

// Edit Transaction
window.editTransaction = function(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  descriptionInput.value = tx.description;
  dateInput.value = tx.date;
  categoryInput.value = tx.category;
  amountInput.value = tx.amount;

  isEditing = true;
  editId = id;

  document.querySelector("button[type='submit']").textContent = "Update Transaction";
};

// Save to localStorage
function saveToLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Toggle Theme
themeToggle.addEventListener('change', function () {
  if (this.checked) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'true');
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'false');
  }
  renderChart(); // Refresh chart colors
});

// Render Pie Chart
function renderChart() {
  const categoryTotals = {};

  transactions.forEach(tx => {
    if (!categoryTotals[tx.category]) {
      categoryTotals[tx.category] = 0;
    }
    categoryTotals[tx.category] += tx.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  const isDarkMode = document.body.classList.contains('dark-mode');

  const bgColor = isDarkMode ? [
    '#e67e80', '#8ab6f4', '#f5d742', '#7adcb7', '#bfaeff', '#fca9a9'
  ] : [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
  ];

  const ctx = document.getElementById('categoryChart')?.getContext('2d');
  if (!ctx) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        label: 'Expenses by Category',
        data: data,
        backgroundColor: bgColor
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' },
        title: { display: true, text: 'Spending Distribution by Category' }
      }
    }
  });
}

// CSV Export
window.exportToCSV = function() {
  if (transactions.length === 0) {
    alert("No transactions to export.");
    return;
  }

  let csv = "Description,Date,Category,Amount,Type\n";
  transactions.forEach(tx => {
    csv += `"${tx.description}","${tx.date}","${tx.category}",${tx.amount},${tx.type}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", "expenses.csv");
  a.click();
};

// CSV Import
document.getElementById('csvFile')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    const text = event.target.result;
    const rows = text.split('\n').slice(1); // skip header

    rows.forEach(row => {
      const [description, date, category, amount, type] = row.trim().split(',');
      if (!description || !amount || !category) return;

      const newTx = {
        id: Date.now() + Math.random(),
        description,
        date,
        category,
        amount: parseFloat(amount),
        type
      };
      transactions.push(newTx);
    });

    saveToLocalStorage();
    updateUI();
    e.target.value = '';
  };

  reader.readAsText(file);
});