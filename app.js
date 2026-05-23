/* -------------------------------------------------------------
 * INVOICIFY — CORE LOGIC & STATE CONTROLLER
 * ------------------------------------------------------------- */

// --- Firebase Global State & Config ---
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let isSandboxMode = true;
let isConfigPanelExpanded = false;
let authMode = 'signin'; // 'signin' or 'signup'
let selectedBackend = localStorage.getItem('invoicify_backend_type') || 'firebase';

// --- Global Application State ---
let currentInvoice = {
  id: '',
  logo: '',
  senderName: '',
  senderEmail: '',
  senderPhone: '',
  senderAddress: '',
  senderBank: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  invoiceNum: '',
  currency: 'USD',
  issueDate: '',
  dueDate: '',
  status: 'Draft',
  items: [],
  taxRate: 0,
  discountRate: 0,
  notes: ''
};

let invoiceHistory = [];

// --- Currency Config Map ---
const CURRENCY_MAP = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  INR: { symbol: '₹', locale: 'en-IN' },
  CAD: { symbol: 'C$', locale: 'en-CA' },
  AUD: { symbol: 'A$', locale: 'en-AU' },
  JPY: { symbol: '¥', locale: 'ja-JP' },
  SGD: { symbol: 'S$', locale: 'en-SG' }
};

// --- DOM Elements Reference ---
const elements = {
  // Action Buttons
  btnNew: document.getElementById('btn-new'),
  btnSave: document.getElementById('btn-save'),
  btnPrint: document.getElementById('btn-print'),
  btnHistoryToggle: document.getElementById('btn-history-toggle'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnGenerateNumber: document.getElementById('btn-generate-number'),
  btnAddItem: document.getElementById('btn-add-item'),
  
  // Drawer Panel
  drawer: document.getElementById('dashboard-drawer'),
  historyList: document.getElementById('history-list'),
  historyBadge: document.getElementById('history-badge'),
  
  // Form Inputs
  logoFileInput: document.getElementById('logo-file-input'),
  logoDropzone: document.getElementById('logo-dropzone'),
  logoPreviewWrapper: document.getElementById('logo-preview-wrapper'),
  logoImgPreview: document.getElementById('logo-img-preview'),
  btnRemoveLogo: document.getElementById('btn-remove-logo'),
  
  senderName: document.getElementById('sender-name'),
  senderEmail: document.getElementById('sender-email'),
  senderPhone: document.getElementById('sender-phone'),
  senderAddress: document.getElementById('sender-address'),
  senderBank: document.getElementById('sender-bank'),
  chkSaveProfile: document.getElementById('chk-save-profile'),
  
  clientName: document.getElementById('client-name'),
  clientEmail: document.getElementById('client-email'),
  clientPhone: document.getElementById('client-phone'),
  clientAddress: document.getElementById('client-address'),
  
  invoiceNumber: document.getElementById('invoice-number'),
  invoiceCurrency: document.getElementById('invoice-currency'),
  invoiceDate: document.getElementById('invoice-date'),
  invoiceDue: document.getElementById('invoice-due'),
  invoiceStatus: document.getElementById('invoice-status'),
  
  itemsList: document.getElementById('items-list'),
  invoiceTax: document.getElementById('invoice-tax'),
  invoiceDiscount: document.getElementById('invoice-discount'),
  invoiceNotes: document.getElementById('invoice-notes'),
  
  // Live Preview Elements
  sheetLogoContainer: document.getElementById('sheet-logo-container'),
  previewSenderName: document.getElementById('preview-sender-name'),
  previewSenderAddress: document.getElementById('preview-sender-address'),
  previewSenderContact: document.getElementById('preview-sender-contact'),
  
  previewInvoiceNum: document.getElementById('preview-invoice-num'),
  previewInvoiceDate: document.getElementById('preview-invoice-date'),
  previewInvoiceDue: document.getElementById('preview-invoice-due'),
  previewInvoiceStatus: document.getElementById('preview-invoice-status'),
  
  previewClientName: document.getElementById('preview-client-name'),
  previewClientAddress: document.getElementById('preview-client-address'),
  previewClientContact: document.getElementById('preview-client-contact'),
  previewPaymentInstructions: document.getElementById('preview-payment-instructions'),
  
  previewItemsRows: document.getElementById('preview-items-rows'),
  previewInvoiceNotes: document.getElementById('preview-invoice-notes'),
  
  previewSubtotal: document.getElementById('preview-subtotal'),
  previewDiscountRow: document.getElementById('preview-discount-row'),
  previewDiscountRate: document.getElementById('preview-discount-rate'),
  previewDiscountVal: document.getElementById('preview-discount-val'),
  previewTaxRow: document.getElementById('preview-tax-row'),
  previewTaxRate: document.getElementById('preview-tax-rate'),
  previewTaxVal: document.getElementById('preview-tax-val'),
  previewGrandTotal: document.getElementById('preview-grand-total'),
  
  // Dashboard Analytics Stats
  statTotal: document.getElementById('stat-total'),
  statPaid: document.getElementById('stat-paid'),
  statDraft: document.getElementById('stat-draft'),
  statCount: document.getElementById('stat-count'),
  chartBarsGroup: document.getElementById('chart-bars-group'),

  // Firebase Auth Elements
  authScreen: document.getElementById('auth-screen'),
  authForm: document.getElementById('auth-form'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  btnAuthSubmit: document.getElementById('btn-auth-submit'),
  tabSignin: document.getElementById('tab-signin'),
  tabSignup: document.getElementById('tab-signup'),
  authErrorBanner: document.getElementById('auth-error-banner'),
  authErrorMsg: document.getElementById('auth-error-msg'),
  linkSandbox: document.getElementById('link-sandbox'),
  sandboxBanner: document.getElementById('sandbox-banner'),
  linkSetupFirebase: document.getElementById('link-setup-firebase'),
  
  // Developer Config Panel Elements
  btnConfigToggle: document.getElementById('btn-config-toggle'),
  configContent: document.getElementById('config-content'),
  cfgApiKey: document.getElementById('cfg-apikey'),
  cfgAuthDomain: document.getElementById('cfg-authdomain'),
  cfgProjectId: document.getElementById('cfg-projectid'),
  cfgAppId: document.getElementById('cfg-appid'),
  cfgSheetsUrl: document.getElementById('cfg-sheets-url'),
  btnBackendFirebase: document.getElementById('btn-backend-firebase'),
  btnBackendSheets: document.getElementById('btn-backend-sheets'),
  btnBackendMock: document.getElementById('btn-backend-mock'),
  configFirebaseGroup: document.getElementById('config-firebase-group'),
  configSheetsGroup: document.getElementById('config-sheets-group'),
  configMockGroup: document.getElementById('config-mock-group'),
  btnSaveConfig: document.getElementById('btn-save-config'),
  
  // User Profile & Sign Out Controls
  userProfileBadge: document.getElementById('user-profile-badge'),
  userEmailDisplay: document.getElementById('user-email-display'),
  btnLogout: document.getElementById('btn-logout')
};

// --- Environment Variables Loader ---
async function loadEnvConfig() {
  let env = {};
  let loadedFromApi = false;

  // 1. First, attempt to load from the Vercel Serverless Config API
  try {
    const response = await fetch('/api/config');
    if (response.ok) {
      env = await response.json();
      loadedFromApi = true;
      console.log("Successfully loaded environment variables from Vercel Serverless API (/api/config)!");
    }
  } catch (error) {
    console.log("Could not load from /api/config (normal in local static dev). Trying local .env...");
  }

  // 2. Fall back to local .env file parsing if not loaded from the Serverless API
  if (!loadedFromApi) {
    try {
      const response = await fetch('.env');
      if (response.ok) {
        const text = await response.text();
        text.split(/\r?\n/).forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#')) return;
          
          const match = trimmedLine.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            let key = match[1];
            let value = match[2] || '';
            
            // Strip trailing comment from value if present
            const commentIndex = value.indexOf('#');
            if (commentIndex !== -1) {
              value = value.substring(0, commentIndex).trim();
            }
            
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            env[key] = value.trim();
          }
        });
        console.log("Successfully loaded environment variables from local .env file!");
      } else {
        console.warn("Could not load local .env file directly (expected in file:// protocol or deployed production without local fallback).");
      }
    } catch (error) {
      console.warn("Failed to fetch or parse local .env file:", error);
    }
  }

  // 3. Process the loaded environment variables
  if (env.GOOGLE_SHEETS_URL) {
    localStorage.setItem('invoicify_sheets_url', env.GOOGLE_SHEETS_URL);
    console.log("Google Sheets URL saved from environment configuration.");
  }

  const fbApiKey = env.FIREBASE_API_KEY || env.apiKey;
  if (fbApiKey && fbApiKey !== "YOUR_API_KEY" && fbApiKey !== "AIzaSyDUY29Ecg5q65fgV3Nf-xvTXDkAIDVqhjQ") {
    const firebaseConfig = {
      apiKey: fbApiKey,
      authDomain: env.FIREBASE_AUTH_DOMAIN || env.authDomain,
      projectId: env.FIREBASE_PROJECT_ID || env.projectId,
      storageBucket: env.FIREBASE_STORAGE_BUCKET || env.storageBucket,
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || env.messagingSenderId,
      appId: env.FIREBASE_APP_ID || env.appId
    };
    
    // Save to local storage for persistence
    localStorage.setItem('invoicify_firebase_config', JSON.stringify(firebaseConfig));
    // Populate window.firebaseConfig so standard initFirebase can pick it up instantly
    window.firebaseConfig = firebaseConfig;
    console.log("Firebase Web App configuration successfully loaded and activated from environment variables.");
  }
}

// --- Initial Setup / Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadEnvConfig();
  initFirebase();
  setupAccordionSystem();
  setupEventListeners();
  setupFirebaseEventListeners();
  loadDefaultSenderProfile();
  
  if (isSandboxMode) {
    enableSandboxMode(false);
  } else {
    listenToAuthState();
  }
  
  startNewInvoice(true); // Create fresh draft with auto-generated elements
});

// --- Accordion Behavior ---
function setupAccordionSystem() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
      const accordion = header.parentElement;
      accordion.classList.toggle('active');
    });
  });
}

// --- Toast Banners dispatcher ---
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check_circle';
  else if (type === 'warning') icon = 'warning';
  else if (type === 'error') icon = 'error';
  
  toast.innerHTML = `
    <span class="material-icons-round toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Transition out & remove
  setTimeout(() => {
    toast.style.animation = 'slide-up-in 0.3s reverse forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}

// --- Date Formatter ---
function formatDateForPreview(dateString) {
  if (!dateString) return '—';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  
  // Avoid local timezone shifting issues
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-US', options);
}

// --- Currency Formatter ---
function formatCurrency(amount, currencyCode = 'USD') {
  const cfg = CURRENCY_MAP[currencyCode] || CURRENCY_MAP.USD;
  return cfg.symbol + parseFloat(amount).toLocaleString(cfg.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// --- Create / Reset Invoice State ---
function startNewInvoice(isFirstLoad = false) {
  const today = new Date();
  const issueDateStr = today.toISOString().substring(0, 10);
  
  const due = new Date();
  due.setDate(today.getDate() + 30); // Default due date 30 days from now
  const dueDateStr = due.toISOString().substring(0, 10);
  
  const savedProfile = JSON.parse(localStorage.getItem('invoicify_default_profile')) || {};
  
  currentInvoice = {
    id: Date.now().toString(),
    logo: savedProfile.logo || '',
    senderName: savedProfile.senderName || '',
    senderEmail: savedProfile.senderEmail || '',
    senderPhone: savedProfile.senderPhone || '',
    senderAddress: savedProfile.senderAddress || '',
    senderBank: savedProfile.senderBank || '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceNum: generateIncrementalInvoiceNum(),
    currency: 'USD',
    issueDate: issueDateStr,
    dueDate: dueDateStr,
    status: 'Draft',
    items: [
      { id: Date.now().toString(), description: 'Consulting Services', qty: 1, rate: 125.00 }
    ],
    taxRate: 0,
    discountRate: 0,
    notes: 'Please remit payment within 30 days. Late accounts carry interest.'
  };

  syncStateToForm();
  updateCalculationsAndPreview();
  
  if (!isFirstLoad) {
    showToast('New invoice template loaded.', 'success');
  }
}

// --- Generate Auto-Incrementing Invoice No ---
function generateIncrementalInvoiceNum() {
  if (invoiceHistory.length === 0) {
    return 'INV-2026-001';
  }
  
  // Try to find the latest invoice matching standard formats
  const nums = invoiceHistory
    .map(inv => inv.invoiceNum)
    .filter(num => /^INV-\d{4}-\d+$/.test(num));
    
  if (nums.length === 0) {
    return `INV-2026-${String(invoiceHistory.length + 1).padStart(3, '0')}`;
  }
  
  // Sort and grab the highest numeric value suffix
  nums.sort();
  const highest = nums[nums.length - 1];
  const parts = highest.split('-');
  const nextNum = parseInt(parts[parts.length - 1]) + 1;
  return `INV-2026-${String(nextNum).padStart(3, '0')}`;
}

// --- Load History Database ---
function loadHistoryFromStorage() {
  const data = localStorage.getItem('invoicify_history');
  if (data) {
    try {
      invoiceHistory = JSON.parse(data);
      // Sort newest first
      invoiceHistory.sort((a, b) => Number(b.id) - Number(a.id));
    } catch (e) {
      invoiceHistory = [];
      showToast('Error reading invoice history.', 'error');
    }
  } else {
    invoiceHistory = [];
  }
  updateHistoryUI();
  updateAnalyticsDashboard();
}

// --- Save History Database ---
function saveHistoryToStorage() {
  localStorage.setItem('invoicify_history', JSON.stringify(invoiceHistory));
  updateHistoryUI();
  updateAnalyticsDashboard();
}

// --- Load History from Cloud Firestore ---
function loadHistoryFromFirestore() {
  if (isSandboxMode || !firebaseAuth || !firebaseAuth.currentUser) return;
  const user = firebaseAuth.currentUser;
  
  firebaseDb.collection("users").doc(user.uid).collection("invoices").get()
    .then(querySnapshot => {
      invoiceHistory = [];
      querySnapshot.forEach(doc => {
        invoiceHistory.push(doc.data());
      });
      // Sort newest first
      invoiceHistory.sort((a, b) => Number(b.id) - Number(a.id));
      
      updateHistoryUI();
      updateAnalyticsDashboard();
    })
    .catch(err => {
      console.error("Error reading history from Firestore:", err);
      showToast("Cloud sync failed. Working offline.", "error");
    });
}

// --- Sync Local Offline History to Cloud Firestore ---
function syncLocalHistoryToCloud() {
  if (isSandboxMode || !firebaseAuth || !firebaseAuth.currentUser) return;
  const user = firebaseAuth.currentUser;
  
  // Read local storage history
  const data = localStorage.getItem('invoicify_history');
  if (!data) return;
  
  try {
    const localHistory = JSON.parse(data);
    if (localHistory.length === 0) return;
    
    showToast("Syncing offline drafts to cloud...", "info");
    
    const batch = firebaseDb.batch();
    localHistory.forEach(inv => {
      const docRef = firebaseDb.collection("users").doc(user.uid).collection("invoices").doc(inv.id);
      batch.set(docRef, inv);
    });
    
    batch.commit().then(() => {
      showToast("Offline invoices synced successfully!", "success");
      localStorage.removeItem('invoicify_history'); // Clear local memory after sync
      loadHistoryFromFirestore();
    }).catch(err => {
      console.error("Batch sync error:", err);
    });
  } catch (e) {
    console.error("Error syncing local history", e);
  }
}


// --- Load Default User Profile ---
function loadDefaultSenderProfile() {
  const saved = localStorage.getItem('invoicify_default_profile');
  if (saved) {
    try {
      const profile = JSON.parse(saved);
      elements.senderName.value = profile.senderName || '';
      elements.senderEmail.value = profile.senderEmail || '';
      elements.senderPhone.value = profile.senderPhone || '';
      elements.senderAddress.value = profile.senderAddress || '';
      elements.senderBank.value = profile.senderBank || '';
      
      if (profile.logo) {
        currentInvoice.logo = profile.logo;
        showLogoPreview(profile.logo);
      }
    } catch(e) {
      console.error('Failed to parse default profile', e);
    }
  }
}

// --- Map Form Fields into currentInvoice State ---
function syncFormToState() {
  currentInvoice.senderName = elements.senderName.value;
  currentInvoice.senderEmail = elements.senderEmail.value;
  currentInvoice.senderPhone = elements.senderPhone.value;
  currentInvoice.senderAddress = elements.senderAddress.value;
  currentInvoice.senderBank = elements.senderBank.value;
  
  currentInvoice.clientName = elements.clientName.value;
  currentInvoice.clientEmail = elements.clientEmail.value;
  currentInvoice.clientPhone = elements.clientPhone.value;
  currentInvoice.clientAddress = elements.clientAddress.value;
  
  currentInvoice.invoiceNum = elements.invoiceNumber.value;
  currentInvoice.currency = elements.invoiceCurrency.value;
  currentInvoice.issueDate = elements.invoiceDate.value;
  currentInvoice.dueDate = elements.invoiceDue.value;
  currentInvoice.status = elements.invoiceStatus.value;
  
  currentInvoice.taxRate = Math.max(0, parseFloat(elements.invoiceTax.value) || 0);
  currentInvoice.discountRate = Math.max(0, parseFloat(elements.invoiceDiscount.value) || 0);
  currentInvoice.notes = elements.invoiceNotes.value;
}

// --- Map currentInvoice State back into Inputs ---
function syncStateToForm() {
  // Sender Profile
  elements.senderName.value = currentInvoice.senderName;
  elements.senderEmail.value = currentInvoice.senderEmail;
  elements.senderPhone.value = currentInvoice.senderPhone;
  elements.senderAddress.value = currentInvoice.senderAddress;
  elements.senderBank.value = currentInvoice.senderBank;
  
  // Client Details
  elements.clientName.value = currentInvoice.clientName;
  elements.clientEmail.value = currentInvoice.clientEmail;
  elements.clientPhone.value = currentInvoice.clientPhone;
  elements.clientAddress.value = currentInvoice.clientAddress;
  
  // Invoice config
  elements.invoiceNumber.value = currentInvoice.invoiceNum;
  elements.invoiceCurrency.value = currentInvoice.currency;
  elements.invoiceDate.value = currentInvoice.issueDate;
  elements.invoiceDue.value = currentInvoice.dueDate;
  elements.invoiceStatus.value = currentInvoice.status;
  elements.invoiceTax.value = currentInvoice.taxRate;
  elements.invoiceDiscount.value = currentInvoice.discountRate;
  elements.invoiceNotes.value = currentInvoice.notes;
  
  // Handle logo UI states
  if (currentInvoice.logo) {
    showLogoPreview(currentInvoice.logo);
  } else {
    removeLogoPreview();
  }
  
  // Items rendering
  renderLineItemsEditor();
}

// --- Render Line Item Editor Input Rows ---
function renderLineItemsEditor() {
  elements.itemsList.innerHTML = '';
  
  currentInvoice.items.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'item-editor-row';
    tr.dataset.id = item.id;
    
    const totalVal = formatCurrency(item.qty * item.rate, currentInvoice.currency);
    
    tr.innerHTML = `
      <td>
        <input type="text" class="input-item-desc" placeholder="Service description..." value="${escapeHtml(item.description)}" required>
      </td>
      <td class="col-qty">
        <input type="number" class="input-item-qty" placeholder="1" min="1" step="1" value="${item.qty}" required>
      </td>
      <td class="col-price">
        <input type="number" class="input-item-rate" placeholder="0.00" min="0" step="0.01" value="${item.rate}" required>
      </td>
      <td class="col-total">
        <span class="item-row-total-val">${totalVal}</span>
      </td>
      <td class="col-actions">
        <button type="button" class="btn-delete-row" title="Delete Row">
          <span class="material-icons-round">delete_outline</span>
        </button>
      </td>
    `;
    
    // Bind change/input listeners directly on elements inside this row
    const inputDesc = tr.querySelector('.input-item-desc');
    const inputQty = tr.querySelector('.input-item-qty');
    const inputRate = tr.querySelector('.input-item-rate');
    const btnDel = tr.querySelector('.btn-delete-row');
    
    const syncItem = () => {
      item.description = inputDesc.value;
      item.qty = Math.max(1, parseInt(inputQty.value) || 1);
      item.rate = Math.max(0, parseFloat(inputRate.value) || 0);
      
      // Update item row total in editor instantly
      const updatedTotal = item.qty * item.rate;
      tr.querySelector('.item-row-total-val').textContent = formatCurrency(updatedTotal, currentInvoice.currency);
      
      updateCalculationsAndPreview();
    };
    
    inputDesc.addEventListener('input', syncItem);
    inputQty.addEventListener('input', syncItem);
    inputRate.addEventListener('input', syncItem);
    
    btnDel.addEventListener('click', () => {
      // Ensure at least 1 item stays active
      if (currentInvoice.items.length <= 1) {
        showToast('Invoices require at least one line item.', 'warning');
        return;
      }
      
      // Transition removal animation
      tr.style.transform = 'translateX(-20px)';
      tr.style.opacity = '0';
      tr.style.transition = 'all 0.25s ease';
      
      setTimeout(() => {
        currentInvoice.items = currentInvoice.items.filter(it => it.id !== item.id);
        renderLineItemsEditor();
        updateCalculationsAndPreview();
      }, 250);
    });
    
    elements.itemsList.appendChild(tr);
  });
}

// --- Live Recalculate Subtotal, Taxes, Discounts & Updates Preview ---
function updateCalculationsAndPreview() {
  syncFormToState();
  
  // 1. Math formulas
  let subtotal = 0;
  currentInvoice.items.forEach(item => {
    subtotal += item.qty * item.rate;
  });
  
  const discountVal = subtotal * (currentInvoice.discountRate / 100);
  const taxableSubtotal = subtotal - discountVal;
  const taxVal = taxableSubtotal * (currentInvoice.taxRate / 100);
  const grandTotal = taxableSubtotal + taxVal;
  
  // 2. Render Calculations onto Workspace Editor Inputs
  elements.previewSubtotal.textContent = formatCurrency(subtotal, currentInvoice.currency);
  
  if (currentInvoice.discountRate > 0) {
    elements.previewDiscountRow.classList.remove('hidden');
    elements.previewDiscountRate.textContent = currentInvoice.discountRate.toFixed(1);
    elements.previewDiscountVal.textContent = `-${formatCurrency(discountVal, currentInvoice.currency)}`;
  } else {
    elements.previewDiscountRow.classList.add('hidden');
  }
  
  if (currentInvoice.taxRate > 0) {
    elements.previewTaxRow.classList.remove('hidden');
    elements.previewTaxRate.textContent = currentInvoice.taxRate.toFixed(1);
    elements.previewTaxVal.textContent = formatCurrency(taxVal, currentInvoice.currency);
  } else {
    elements.previewTaxRow.classList.add('hidden');
  }
  
  elements.previewGrandTotal.textContent = formatCurrency(grandTotal, currentInvoice.currency);
  
  // 3. Sync Texts & Headers into A4 Live Page Preview
  elements.previewSenderName.textContent = currentInvoice.senderName || 'Sender Business Name';
  
  const addressLine = currentInvoice.senderAddress || '123 Business Address City, Zip';
  elements.previewSenderAddress.innerHTML = addressLine.replace(/\n/g, '<br>');
  
  const contactParts = [];
  if (currentInvoice.senderEmail) contactParts.push(currentInvoice.senderEmail);
  if (currentInvoice.senderPhone) contactParts.push(currentInvoice.senderPhone);
  elements.previewSenderContact.textContent = contactParts.join(' | ') || 'email@business.com | Phone';
  
  elements.previewInvoiceNum.textContent = currentInvoice.invoiceNum || 'INV-XXXX-XXX';
  elements.previewInvoiceDate.textContent = formatDateForPreview(currentInvoice.issueDate);
  elements.previewInvoiceDue.textContent = formatDateForPreview(currentInvoice.dueDate);
  
  // Render Status Badge
  let badgeClass = 'draft';
  if (currentInvoice.status === 'Sent') badgeClass = 'sent';
  else if (currentInvoice.status === 'Paid') badgeClass = 'paid';
  else if (currentInvoice.status === 'Overdue') badgeClass = 'overdue';
  elements.previewInvoiceStatus.innerHTML = `<span class="badge ${badgeClass}">${currentInvoice.status}</span>`;
  
  // Client address details
  elements.previewClientName.textContent = currentInvoice.clientName || 'Client Company / Name';
  
  const clientAddrLine = currentInvoice.clientAddress || '456 Corporate Address City, Country';
  elements.previewClientAddress.innerHTML = clientAddrLine.replace(/\n/g, '<br>');
  
  const clientContactParts = [];
  if (currentInvoice.clientEmail) clientContactParts.push(currentInvoice.clientEmail);
  if (currentInvoice.clientPhone) clientContactParts.push(currentInvoice.clientPhone);
  elements.previewClientContact.textContent = clientContactParts.join(' | ') || 'accounts@client.com | Phone';
  
  // Terms & Payment block
  elements.previewPaymentInstructions.innerHTML = currentInvoice.senderBank 
    ? `<strong>Payment Details:</strong><br>${currentInvoice.senderBank.replace(/\n/g, '<br>')}` 
    : 'Bank details will be displayed here once entered in the form.';
    
  elements.previewInvoiceNotes.innerHTML = currentInvoice.notes.replace(/\n/g, '<br>') || 'Payment terms apply.';
  
  // 4. Render Logo inside Preview
  elements.sheetLogoContainer.innerHTML = '';
  if (currentInvoice.logo) {
    const img = document.createElement('img');
    img.src = currentInvoice.logo;
    img.alt = 'Business Logo';
    elements.sheetLogoContainer.appendChild(img);
  } else {
    elements.sheetLogoContainer.innerHTML = `
      <div class="sheet-logo-placeholder">
        <span class="material-icons-round">business</span>
      </div>
    `;
  }
  
  // 5. Render Table Items inside Preview
  elements.previewItemsRows.innerHTML = '';
  currentInvoice.items.forEach(item => {
    const tr = document.createElement('tr');
    
    const descText = item.description || 'Line item details...';
    const qtyText = item.qty;
    const rateText = formatCurrency(item.rate, currentInvoice.currency);
    const amountText = formatCurrency(item.qty * item.rate, currentInvoice.currency);
    
    tr.innerHTML = `
      <td class="text-left"><span class="preview-item-name">${escapeHtml(descText)}</span></td>
      <td class="text-center col-w-10">${qtyText}</td>
      <td class="text-right col-w-15">${rateText}</td>
      <td class="text-right col-w-20 font-bold">${amountText}</td>
    `;
    elements.previewItemsRows.appendChild(tr);
  });
}

// --- Logo Image base64 Upload handlers ---
function showLogoPreview(dataUrl) {
  elements.logoDropzone.classList.add('has-preview');
  elements.logoPreviewWrapper.classList.remove('hidden');
  elements.logoImgPreview.src = dataUrl;
  elements.logoDropzone.querySelector('.dropzone-placeholder').classList.add('hidden');
}

function removeLogoPreview() {
  currentInvoice.logo = '';
  elements.logoFileInput.value = '';
  elements.logoDropzone.classList.remove('has-preview');
  elements.logoPreviewWrapper.classList.add('hidden');
  elements.logoImgPreview.src = '';
  elements.logoDropzone.querySelector('.dropzone-placeholder').classList.remove('hidden');
  
  // Auto-clear from default profile if checking active state
  const saved = localStorage.getItem('invoicify_default_profile');
  if (saved) {
    const profile = JSON.parse(saved);
    profile.logo = '';
    localStorage.setItem('invoicify_default_profile', JSON.stringify(profile));
  }
  
  updateCalculationsAndPreview();
}

function handleLogoFile(file) {
  if (!file) return;
  
  // Limit to 2MB
  if (file.size > 2 * 1024 * 1024) {
    showToast('File is too large. 2MB max allowed size.', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    currentInvoice.logo = dataUrl;
    showLogoPreview(dataUrl);
    updateCalculationsAndPreview();
    showToast('Logo uploaded and synced to A4 sheet.', 'success');
    
    // Save to active default profile if matching checked
    if (elements.chkSaveProfile.checked) {
      saveProfileSettingsLocally();
    }
  };
  reader.readAsDataURL(file);
}

// --- Auto-Save default Sender Profile Details ---
function saveProfileSettingsLocally() {
  const profile = {
    logo: currentInvoice.logo,
    senderName: elements.senderName.value,
    senderEmail: elements.senderEmail.value,
    senderPhone: elements.senderPhone.value,
    senderAddress: elements.senderAddress.value,
    senderBank: elements.senderBank.value
  };
  localStorage.setItem('invoicify_default_profile', JSON.stringify(profile));
}

// --- Save Active Invoice to History ---
function saveActiveInvoice() {
  syncFormToState();
  
  // Validation checks
  if (!currentInvoice.senderName) {
    showToast('Please enter your Business/Sender name.', 'warning');
    elements.senderName.focus();
    return;
  }
  if (!currentInvoice.senderEmail) {
    showToast('Please enter your Business Email Address.', 'warning');
    elements.senderEmail.focus();
    return;
  }
  if (!currentInvoice.clientName) {
    showToast('Please specify a client name.', 'warning');
    elements.clientName.focus();
    return;
  }
  if (!currentInvoice.invoiceNum) {
    showToast('Please enter a valid Invoice Number.', 'warning');
    elements.invoiceNumber.focus();
    return;
  }
  if (currentInvoice.items.length === 0 || !currentInvoice.items[0].description) {
    showToast('Invoices require at least one populated line item.', 'warning');
    return;
  }

  // Calculate totals to save into history
  let subtotal = 0;
  currentInvoice.items.forEach(item => {
    subtotal += item.qty * item.rate;
  });
  const discountVal = subtotal * (currentInvoice.discountRate / 100);
  const taxable = subtotal - discountVal;
  const taxVal = taxable * (currentInvoice.taxRate / 100);
  currentInvoice.grandTotal = taxable + taxVal;
  
  // Check if editing an existing invoice or adding new
  if (isSandboxMode) {
    const index = invoiceHistory.findIndex(inv => inv.id === currentInvoice.id || inv.invoiceNum === currentInvoice.invoiceNum);
    if (index !== -1) {
      // Overwrite
      invoiceHistory[index] = JSON.parse(JSON.stringify(currentInvoice));
      showToast(`Invoice ${currentInvoice.invoiceNum} updated successfully!`, 'success');
    } else {
      // Insert new
      invoiceHistory.unshift(JSON.parse(JSON.stringify(currentInvoice)));
      showToast(`Invoice ${currentInvoice.invoiceNum} saved to history!`, 'success');
    }
    saveHistoryToStorage();
  } else {
    // Write directly to Firestore
    const user = firebaseAuth.currentUser;
    if (!user) {
      showToast("Session expired. Please sign in.", "error");
      return;
    }
    
    firebaseDb.collection("users").doc(user.uid).collection("invoices").doc(currentInvoice.id).set(currentInvoice)
      .then(() => {
        showToast(`Invoice ${currentInvoice.invoiceNum} synced to cloud!`, 'success');
        loadHistoryFromFirestore();
      })
      .catch(err => {
        console.error("Firestore save error:", err);
        showToast("Cloud sync failed.", "error");
      });
  }
  
  // Trigger profile save if checked
  if (elements.chkSaveProfile.checked) {
    saveProfileSettingsLocally();
  }
}

// --- History List rendering inside Sidebar Panel ---
function updateHistoryUI() {
  elements.historyBadge.textContent = invoiceHistory.length;
  elements.historyList.innerHTML = '';
  
  if (invoiceHistory.length === 0) {
    elements.historyList.innerHTML = `
      <div class="history-empty">
        <span class="material-icons-round">folder_open</span>
        <p>No invoices saved in your browser history yet.</p>
      </div>
    `;
    return;
  }
  
  invoiceHistory.forEach(inv => {
    const card = document.createElement('div');
    card.className = `history-card`;
    card.dataset.id = inv.id;
    
    let statusClass = 'draft';
    if (inv.status === 'Sent') statusClass = 'sent';
    else if (inv.status === 'Paid') statusClass = 'paid';
    else if (inv.status === 'Overdue') statusClass = 'overdue';
    
    card.innerHTML = `
      <div class="history-card-left">
        <span class="history-id">${escapeHtml(inv.invoiceNum)}</span>
        <span class="history-client">${escapeHtml(inv.clientName || 'Unnamed Client')}</span>
        <span class="history-date">${formatDateForPreview(inv.issueDate)}</span>
      </div>
      <div class="history-card-right">
        <span class="history-amt">${formatCurrency(inv.grandTotal || 0, inv.currency)}</span>
        <div class="history-actions-row">
          <span class="badge ${statusClass}">${inv.status}</span>
          <button type="button" class="btn-history-del" title="Delete Saved Invoice">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      </div>
    `;
    
    // Clicking card loads it
    card.addEventListener('click', (e) => {
      // Don't trigger loading if they clicked the trash icon
      if (e.target.closest('.btn-history-del')) return;
      
      loadInvoiceFromHistory(inv.id);
    });
    
    // Trash listener
    const btnDel = card.querySelector('.btn-history-del');
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete invoice ${inv.invoiceNum}?`)) {
        deleteInvoiceFromHistory(inv.id);
      }
    });
    
    elements.historyList.appendChild(card);
  });
}

// --- Load Saved Invoice into Form & Preview ---
function loadInvoiceFromHistory(id) {
  const inv = invoiceHistory.find(item => item.id === id);
  if (!inv) return;
  
  currentInvoice = JSON.parse(JSON.stringify(inv)); // Deep clone
  syncStateToForm();
  updateCalculationsAndPreview();
  
  // Close drawer sidebar on load for space
  elements.drawer.classList.remove('open');
  showToast(`Loaded invoice ${inv.invoiceNum}!`, 'info');
}

// --- Delete Invoice from History ---
function deleteInvoiceFromHistory(id) {
  const inv = invoiceHistory.find(item => item.id === id);
  const num = inv ? inv.invoiceNum : '';
  
  if (isSandboxMode) {
    invoiceHistory = invoiceHistory.filter(item => item.id !== id);
    saveHistoryToStorage();
    showToast(`Deleted invoice ${num} from local history.`, 'warning');
  } else {
    const user = firebaseAuth.currentUser;
    if (!user) return;
    
    firebaseDb.collection("users").doc(user.uid).collection("invoices").doc(id).delete()
      .then(() => {
        showToast(`Deleted invoice ${num} from cloud storage.`, 'warning');
        loadHistoryFromFirestore();
      })
      .catch(err => {
        console.error("Firestore delete error:", err);
        showToast("Failed to delete from cloud.", "error");
      });
  }
}

// --- Global Event Listener Aggregator ---
function setupEventListeners() {
  // Global buttons
  elements.btnNew.addEventListener('click', () => {
    if (confirm('Create a new invoice? Unsaved changes to the current invoice will be lost.')) {
      startNewInvoice();
    }
  });
  
  elements.btnSave.addEventListener('click', saveActiveInvoice);
  
  elements.btnPrint.addEventListener('click', () => {
    // Prompt to save before printing
    syncFormToState();
    if (currentInvoice.senderName && currentInvoice.clientName) {
      saveProfileSettingsLocally();
    }
    window.print();
  });
  
  elements.btnHistoryToggle.addEventListener('click', () => {
    elements.drawer.classList.toggle('open');
  });
  
  elements.btnCloseDrawer.addEventListener('click', () => {
    elements.drawer.classList.remove('open');
  });
  
  elements.btnClearHistory.addEventListener('click', () => {
    if (confirm('CAUTION: This will permanently delete all saved invoices. This cannot be undone. Proceed?')) {
      if (isSandboxMode) {
        invoiceHistory = [];
        saveHistoryToStorage();
        showToast('Local history completely cleared.', 'error');
      } else {
        const user = firebaseAuth.currentUser;
        if (!user) return;
        
        firebaseDb.collection("users").doc(user.uid).collection("invoices").get()
          .then(querySnapshot => {
            const batch = firebaseDb.batch();
            querySnapshot.forEach(doc => {
              batch.delete(doc.ref);
            });
            return batch.commit();
          })
          .then(() => {
            showToast('Cloud invoice history completely cleared.', 'error');
            loadHistoryFromFirestore();
          })
          .catch(err => {
            console.error("Clear error:", err);
            showToast("Failed to clear cloud history.", "error");
          });
      }
    }
  });
  
  elements.btnGenerateNumber.addEventListener('click', () => {
    elements.invoiceNumber.value = generateIncrementalInvoiceNum();
    updateCalculationsAndPreview();
    showToast('New invoice ID generated.', 'info');
  });
  
  elements.btnAddItem.addEventListener('click', () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      qty: 1,
      rate: 0.00
    };
    currentInvoice.items.push(newItem);
    renderLineItemsEditor();
    updateCalculationsAndPreview();
    
    // Focus new item text
    const rows = elements.itemsList.querySelectorAll('.item-editor-row');
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const descInput = lastRow.querySelector('.input-item-desc');
      if (descInput) descInput.focus();
    }
  });

  // Watch input changes on basic fields to update preview in real-time
  const liveFields = [
    elements.senderName, elements.senderEmail, elements.senderPhone, elements.senderAddress, elements.senderBank,
    elements.clientName, elements.clientEmail, elements.clientPhone, elements.clientAddress,
    elements.invoiceNumber, elements.invoiceCurrency, elements.invoiceDate, elements.invoiceDue,
    elements.invoiceStatus, elements.invoiceTax, elements.invoiceDiscount, elements.invoiceNotes
  ];
  
  liveFields.forEach(field => {
    field.addEventListener('input', updateCalculationsAndPreview);
    field.addEventListener('change', updateCalculationsAndPreview);
  });

  // Drag & Drop logo events
  const dropzone = elements.logoDropzone;
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragover');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragover');
    }, false);
  });
  
  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleLogoFile(files[0]);
    }
  });
  
  elements.logoFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleLogoFile(e.target.files[0]);
    }
  });
  
  elements.btnRemoveLogo.addEventListener('click', (e) => {
    e.stopPropagation();
    removeLogoPreview();
    showToast('Business logo removed.', 'info');
  });
}

// --- Aggregate Analytics Metrics Dashboard ---
function updateAnalyticsDashboard() {
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalDraft = 0;
  
  invoiceHistory.forEach(inv => {
    // Normalise all values into numerical totals (ignoring currency symbol differences for basic math stats)
    const val = inv.grandTotal || 0;
    totalInvoiced += val;
    
    if (inv.status === 'Paid') {
      totalPaid += val;
    } else {
      totalDraft += val;
    }
  });
  
  elements.statTotal.textContent = formatCurrency(totalInvoiced, 'USD');
  elements.statPaid.textContent = formatCurrency(totalPaid, 'USD');
  elements.statDraft.textContent = formatCurrency(totalDraft, 'USD');
  elements.statCount.textContent = invoiceHistory.length;
  
  renderSVGEarningsChart();
}

// --- Draw Dynamic SVG Statistics Chart ---
function renderSVGEarningsChart() {
  const chartGroup = elements.chartBarsGroup;
  chartGroup.innerHTML = '';
  
  // Create gradient defs once
  let defs = document.querySelector('.svg-chart defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="hsl(217, 91%, 60%)" />
        <stop offset="100%" stop-color="hsl(200, 95%, 55%)" />
      </linearGradient>
    `;
    document.querySelector('.svg-chart').appendChild(defs);
  }
  
  if (invoiceHistory.length === 0) {
    // Draw placeholder labels
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '150');
    text.setAttribute('y', '65');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'rgba(255, 255, 255, 0.25)');
    text.setAttribute('font-size', '10px');
    text.textContent = 'No data available to display trend';
    chartGroup.appendChild(text);
    return;
  }
  
  // We will display a historical distribution chart of the 5 most recent saved invoices
  const dataToShow = invoiceHistory.slice(0, 5).reverse();
  const maxVal = Math.max(...dataToShow.map(inv => inv.grandTotal || 100), 100);
  
  const chartWidth = 250;
  const startX = 40;
  const bottomY = 100;
  const chartHeight = 80;
  
  const totalBars = dataToShow.length;
  const spacing = chartWidth / Math.max(5, totalBars);
  const barWidth = Math.min(24, spacing * 0.55);
  
  dataToShow.forEach((inv, index) => {
    const val = inv.grandTotal || 0;
    const scaledHeight = (val / maxVal) * chartHeight;
    const x = startX + index * spacing;
    const y = bottomY - scaledHeight;
    
    // Draw Bar
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', bottomY); // Start animation from baseline
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', 0);
    rect.setAttribute('class', 'chart-bar');
    
    // Tooltip / title on hover
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${inv.invoiceNum}: ${formatCurrency(val, inv.currency)}`;
    rect.appendChild(title);
    
    chartGroup.appendChild(rect);
    
    // Trigger slide-up animation
    setTimeout(() => {
      rect.setAttribute('y', y);
      rect.setAttribute('height', Math.max(4, scaledHeight));
    }, 50 + index * 50);
    
    // Draw invoice X-axis labels
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x + barWidth / 2);
    text.setAttribute('y', bottomY + 14);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('class', 'chart-text');
    text.textContent = inv.invoiceNum.replace('INV-', '');
    chartGroup.appendChild(text);
  });
}

// --- Helper Functions ---
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- Firebase Engine & State Controllers ---
// --- Local Firebase Mock Engine ---
class MockFirebaseAuth {
  constructor() {
    this.callbacks = [];
    this.currentUser = null;
    
    // Load active session from localStorage
    const session = localStorage.getItem('invoicify_mock_session');
    if (session) {
      try { this.currentUser = JSON.parse(session); } catch(e) {}
    }
  }

  onAuthStateChanged(callback) {
    this.callbacks.push(callback);
    // Trigger callback asynchronously with current user state
    setTimeout(() => {
      callback(this.currentUser);
    }, 50);
  }

  _triggerStateChange() {
    this.callbacks.forEach(cb => cb(this.currentUser));
  }

  signInWithEmailAndPassword(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const normalizedEmail = email.trim().toLowerCase();
        const users = JSON.parse(localStorage.getItem('invoicify_mock_users') || '[]');
        const user = users.find(u => u.email.trim().toLowerCase() === normalizedEmail);
        if (!user || user.password !== password) {
          reject(new Error("Invalid email or password."));
          return;
        }
        this.currentUser = { uid: user.uid, email: user.email };
        localStorage.setItem('invoicify_mock_session', JSON.stringify(this.currentUser));
        this._triggerStateChange();
        resolve({ user: this.currentUser });
      }, 500);
    });
  }

  createUserWithEmailAndPassword(email, password) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const normalizedEmail = email.trim().toLowerCase();
        const users = JSON.parse(localStorage.getItem('invoicify_mock_users') || '[]');
        if (users.find(u => u.email.trim().toLowerCase() === normalizedEmail)) {
          reject(new Error("An account with this email already exists."));
          return;
        }
        const newUser = { uid: 'usr_' + Math.random().toString(36).substr(2, 9), email: normalizedEmail, password };
        users.push(newUser);
        localStorage.setItem('invoicify_mock_users', JSON.stringify(users));
        
        this.currentUser = { uid: newUser.uid, email: newUser.email };
        localStorage.setItem('invoicify_mock_session', JSON.stringify(this.currentUser));
        this._triggerStateChange();
        resolve({ user: this.currentUser });
      }, 500);
    });
  }

  signOut() {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = null;
        localStorage.removeItem('invoicify_mock_session');
        this._triggerStateChange();
        resolve();
      }, 300);
    });
  }
}

class MockFirebaseFirestore {
  collection(name) {
    if (name !== 'users') throw new Error("Mock only supports 'users' collection");
    return {
      doc: (userId) => {
        return {
          collection: (subName) => {
            if (subName !== 'invoices') throw new Error("Mock only supports 'invoices' subcollection");
            return {
              get: () => {
                return new Promise((resolve) => {
                  setTimeout(() => {
                    const allInvoices = JSON.parse(localStorage.getItem(`invoicify_mock_db_${userId}`) || '[]');
                    const docs = allInvoices.map(inv => {
                      return {
                        data: () => inv,
                        ref: { id: inv.id }
                      };
                    });
                    resolve({
                      forEach: (cb) => docs.forEach(cb)
                    });
                  }, 200);
                });
              },
              doc: (invoiceId) => {
                return {
                  set: (invoiceData) => {
                    return new Promise((resolve) => {
                      setTimeout(() => {
                        const allInvoices = JSON.parse(localStorage.getItem(`invoicify_mock_db_${userId}`) || '[]');
                        const index = allInvoices.findIndex(inv => inv.id === invoiceId);
                        if (index !== -1) {
                          allInvoices[index] = invoiceData;
                        } else {
                          allInvoices.unshift(invoiceData);
                        }
                        localStorage.setItem(`invoicify_mock_db_${userId}`, JSON.stringify(allInvoices));
                        resolve();
                      }, 200);
                    });
                  },
                  delete: () => {
                    return new Promise((resolve) => {
                      setTimeout(() => {
                        let allInvoices = JSON.parse(localStorage.getItem(`invoicify_mock_db_${userId}`) || '[]');
                        allInvoices = allInvoices.filter(inv => inv.id !== invoiceId);
                        localStorage.setItem(`invoicify_mock_db_${userId}`, JSON.stringify(allInvoices));
                        resolve();
                      }, 200);
                    });
                  }
                };
              }
            };
          }
        };
      }
    };
  }

  batch() {
    const operations = [];
    return {
      set: (docRef, data) => {
        operations.push({ type: 'set', docRef, data });
      },
      delete: (docRef) => {
        operations.push({ type: 'delete', docRef });
      },
      commit: () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const user = firebaseAuth.currentUser;
            if (user) {
              const userId = user.uid;
              let allInvoices = JSON.parse(localStorage.getItem(`invoicify_mock_db_${userId}`) || '[]');
              
              operations.forEach(op => {
                if (op.type === 'set') {
                  const index = allInvoices.findIndex(inv => inv.id === op.data.id);
                  if (index !== -1) {
                    allInvoices[index] = op.data;
                  } else {
                    allInvoices.unshift(op.data);
                  }
                } else if (op.type === 'delete') {
                  allInvoices = allInvoices.filter(inv => inv.id !== op.docRef.id);
                }
              });
              
              localStorage.setItem(`invoicify_mock_db_${userId}`, JSON.stringify(allInvoices));
            }
            resolve();
          }, 300);
        });
      }
    };
  }
}

function initializeMockFirebase() {
  // Pre-seed default credentials in Mock Engine if missing
  let mockUsers = [];
  try {
    mockUsers = JSON.parse(localStorage.getItem('invoicify_mock_users') || '[]');
  } catch (e) { mockUsers = []; }
  
  const vidhijUser = mockUsers.find(u => u.email.toLowerCase() === 'vidhij0815@gmail.com');
  if (vidhijUser) {
    vidhijUser.password = '19022020';
  } else {
    mockUsers.push({ uid: 'usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a', email: 'vidhij0815@gmail.com', password: '19022020' });
  }
  
  const vidhitestUser = mockUsers.find(u => u.email.toLowerCase() === 'vidhitest@gmail.com');
  if (vidhitestUser) {
    vidhitestUser.password = '123456';
  } else {
    mockUsers.push({ uid: 'usr-a94f382a-e832-47ef-ad9c-b19f20e408d1', email: 'vidhitest@gmail.com', password: '123456' });
  }
  localStorage.setItem('invoicify_mock_users', JSON.stringify(mockUsers));

  // Pre-seed default sender profile if missing
  if (!localStorage.getItem('invoicify_default_profile')) {
    const defaultProfile = {
      logo: '',
      senderName: 'Acme Corporation',
      senderEmail: 'vidhij0815@gmail.com',
      senderPhone: '+1 (555) 019-2834',
      senderAddress: '123 Financial Blvd, Suite 100, New York, NY 10001',
      senderBank: 'Bank: Apex Trust | A/C: 987654321 | Routing: 123456789'
    };
    localStorage.setItem('invoicify_default_profile', JSON.stringify(defaultProfile));
  }

  // Pre-seed default mock invoices for vidhij0815@gmail.com (usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a) if empty
  const vidhijUserId = 'usr-f938c823-1d0b-4bf1-b2ad-20b127bc0f7a';
  const vidhijDbKey = `invoicify_mock_db_${vidhijUserId}`;
  let vidhijInvoices = [];
  try {
    vidhijInvoices = JSON.parse(localStorage.getItem(vidhijDbKey) || '[]');
  } catch (e) { vidhijInvoices = []; }

  if (vidhijInvoices.length === 0) {
    vidhijInvoices = [
      {
        id: 'inv-2026-001',
        invoiceNum: 'INV-2026-001',
        issueDate: '2026-05-21',
        dueDate: '2026-06-20',
        status: 'Draft',
        currency: 'USD',
        taxRate: 8.25,
        discountRate: 5.00,
        notes: 'Standard 30-day payment term applies. Thank you for your business!',
        senderName: 'Acme Corporation',
        senderEmail: 'vidhij0815@gmail.com',
        senderPhone: '+1 (555) 019-2834',
        senderAddress: '123 Financial Blvd, Suite 100, New York, NY 10001',
        senderBank: 'Bank: Apex Trust | A/C: 987654321 | Routing: 123456789',
        clientName: 'Acme Corp Client',
        clientEmail: 'billing@client.com',
        clientPhone: '+1 (555) 019-5555',
        clientAddress: '456 Corporate Ave, Ste 200, Metropolis, NY 10002',
        items: [
          { id: 'item-1', description: 'Premium UI Design & Glassmorphic Development', qty: 1, rate: 2400.00 },
          { id: 'item-2', description: 'Database Integration & Firebase API Engineering', qty: 1, rate: 1800.00 }
        ],
        grandTotal: 4319.18
      },
      {
        id: 'inv-2026-002',
        invoiceNum: 'INV-2026-002',
        issueDate: '2026-05-15',
        dueDate: '2026-06-14',
        status: 'Paid',
        currency: 'USD',
        taxRate: 10.00,
        discountRate: 0.00,
        notes: 'Paid in full on May 19, 2026 via wire transfer.',
        senderName: 'Acme Corporation',
        senderEmail: 'vidhij0815@gmail.com',
        senderPhone: '+1 (555) 019-2834',
        senderAddress: '123 Financial Blvd, Suite 100, New York, NY 10001',
        senderBank: 'Bank: Apex Trust | A/C: 987654321 | Routing: 123456789',
        clientName: 'Global Cloud Solutions',
        clientEmail: 'accounts@globalcloud.com',
        clientPhone: '+1 (555) 019-9999',
        clientAddress: '789 Enterprise Way, Silicon Valley, CA 94025',
        items: [
          { id: 'item-3', description: 'Cloud Server Architecture & Setup Consultation', qty: 5.5, rate: 150.00 }
        ],
        grandTotal: 907.50
      }
    ];
    localStorage.setItem(vidhijDbKey, JSON.stringify(vidhijInvoices));
  }

  // Pre-seed default mock invoices for vidhitest@gmail.com (usr-a94f382a-e832-47ef-ad9c-b19f20e408d1) if empty
  const vidhitestUserId = 'usr-a94f382a-e832-47ef-ad9c-b19f20e408d1';
  const vidhitestDbKey = `invoicify_mock_db_${vidhitestUserId}`;
  let vidhitestInvoices = [];
  try {
    vidhitestInvoices = JSON.parse(localStorage.getItem(vidhitestDbKey) || '[]');
  } catch (e) { vidhitestInvoices = []; }

  if (vidhitestInvoices.length === 0) {
    vidhitestInvoices = [
      {
        id: 'inv-2026-003',
        invoiceNum: 'INV-2026-003',
        issueDate: '2026-05-22',
        dueDate: '2026-06-21',
        status: 'Draft',
        currency: 'USD',
        taxRate: 5.00,
        discountRate: 10.00,
        notes: 'Standard term. Thank you!',
        senderName: 'Vidhi Consulting',
        senderEmail: 'vidhitest@gmail.com',
        senderPhone: '+1 (555) 012-3456',
        senderAddress: '456 Main St, Boston, MA 02110',
        senderBank: 'Bank: Apex Trust | A/C: 1122334455 | Routing: 987654321',
        clientName: 'Invoicify Test Client',
        clientEmail: 'billing@testclient.com',
        clientPhone: '+1 (555) 987-6543',
        clientAddress: '789 Test Ave, Suite 300, Testville, MA 02111',
        items: [
          { id: 'item-4', description: 'Website Redesign & Frontend Polish Services', qty: 1, rate: 1500.00 },
          { id: 'item-5', description: 'Responsive Layout Optimization', qty: 1, rate: 500.00 }
        ],
        grandTotal: 1890.00
      },
      {
        id: 'inv-2026-004',
        invoiceNum: 'INV-2026-004',
        issueDate: '2026-05-10',
        dueDate: '2026-06-09',
        status: 'Paid',
        currency: 'USD',
        taxRate: 0.00,
        discountRate: 0.00,
        notes: 'Paid via bank transfer. Thank you for your business!',
        senderName: 'Vidhi Consulting',
        senderEmail: 'vidhitest@gmail.com',
        senderPhone: '+1 (555) 012-3456',
        senderAddress: '456 Main St, Boston, MA 02110',
        senderBank: 'Bank: Apex Trust | A/C: 1122334455 | Routing: 987654321',
        clientName: 'Global Software LLC',
        clientEmail: 'finance@globalsoftware.com',
        clientPhone: '+1 (555) 777-8888',
        clientAddress: '123 Enterprise Rd, Suite A, Austin, TX 78701',
        items: [
          { id: 'item-6', description: 'Backend API Integration & Testing', qty: 8.00, rate: 120.00 }
        ],
        grandTotal: 960.00
      }
    ];
    localStorage.setItem(vidhitestDbKey, JSON.stringify(vidhitestInvoices));
  }

  firebaseAuth = new MockFirebaseAuth();
  firebaseDb = new MockFirebaseFirestore();
  isSandboxMode = false;
  console.log("Local Mock Firebase Engine initialized successfully!");
}

// --- Google Sheets Free Serverless Database Engine ---
class GoogleSheetsAuth {
  constructor() {
    this.callbacks = [];
    this.currentUser = null;
    
    // Load active session from localStorage
    const session = localStorage.getItem('invoicify_sheets_session');
    if (session) {
      try { this.currentUser = JSON.parse(session); } catch(e) {}
    }
  }

  onAuthStateChanged(callback) {
    this.callbacks.push(callback);
    // Trigger callback asynchronously with current user state
    setTimeout(() => {
      callback(this.currentUser);
    }, 50);
  }

  _triggerStateChange() {
    this.callbacks.forEach(cb => cb(this.currentUser));
  }

  async signInWithEmailAndPassword(email, password) {
    const passwordHash = await hashPassword(password);
    const sheetsUrl = localStorage.getItem('invoicify_sheets_url');
    if (!sheetsUrl) {
      throw new Error("Google Sheets Apps Script URL is not configured.");
    }
    
    try {
      const response = await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'signin',
          email: email,
          passwordHash: passwordHash
        })
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Sign in failed.");
      }
      this.currentUser = { uid: result.userId, email: result.email };
      localStorage.setItem('invoicify_sheets_session', JSON.stringify(this.currentUser));
      this._triggerStateChange();
      return { user: this.currentUser };
    } catch (error) {
      throw new Error(error.message || "Failed to communicate with Google Sheets.");
    }
  }

  async createUserWithEmailAndPassword(email, password) {
    const passwordHash = await hashPassword(password);
    const sheetsUrl = localStorage.getItem('invoicify_sheets_url');
    if (!sheetsUrl) {
      throw new Error("Google Sheets Apps Script URL is not configured.");
    }
    
    try {
      const response = await fetch(sheetsUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'signup',
          email: email,
          passwordHash: passwordHash
        })
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Registration failed.");
      }
      this.currentUser = { uid: result.userId, email: result.email };
      localStorage.setItem('invoicify_sheets_session', JSON.stringify(this.currentUser));
      this._triggerStateChange();
      return { user: this.currentUser };
    } catch (error) {
      throw new Error(error.message || "Failed to communicate with Google Sheets.");
    }
  }

  signOut() {
    return new Promise((resolve) => {
      this.currentUser = null;
      localStorage.removeItem('invoicify_sheets_session');
      this._triggerStateChange();
      resolve();
    });
  }
}

class GoogleSheetsFirestore {
  collection(name) {
    return {
      doc: (userId) => {
        return {
          collection: (subName) => {
            return {
              get: () => {
                const sheetsUrl = localStorage.getItem('invoicify_sheets_url');
                if (!sheetsUrl) return Promise.reject(new Error("Google Sheets Apps Script URL not configured."));
                
                return fetch(sheetsUrl, {
                  method: 'POST',
                  mode: 'cors',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify({
                    action: 'loadInvoices',
                    userId: userId
                  })
                })
                .then(res => res.json())
                .then(result => {
                  if (!result.success) throw new Error(result.message || "Failed to load invoices.");
                  const docs = (result.invoices || []).map(inv => ({
                    data: () => inv,
                    ref: { id: inv.id }
                  }));
                  return {
                    forEach: (cb) => docs.forEach(cb)
                  };
                });
              },
              doc: (invoiceId) => {
                return {
                  set: (invoiceData) => {
                    const sheetsUrl = localStorage.getItem('invoicify_sheets_url');
                    if (!sheetsUrl) return Promise.reject(new Error("Google Sheets Apps Script URL not configured."));
                    
                    return fetch(sheetsUrl, {
                      method: 'POST',
                      mode: 'cors',
                      headers: { 'Content-Type': 'text/plain' },
                      body: JSON.stringify({
                        action: 'saveInvoice',
                        userId: userId,
                        invoice: invoiceData
                      })
                    })
                    .then(res => res.json())
                    .then(result => {
                      if (!result.success) throw new Error(result.message || "Failed to save invoice.");
                    });
                  },
                  delete: () => {
                    const sheetsUrl = localStorage.getItem('invoicify_sheets_url');
                    if (!sheetsUrl) return Promise.reject(new Error("Google Sheets Apps Script URL not configured."));
                    
                    return fetch(sheetsUrl, {
                      method: 'POST',
                      mode: 'cors',
                      headers: { 'Content-Type': 'text/plain' },
                      body: JSON.stringify({
                        action: 'deleteInvoice',
                        userId: userId,
                        invoiceId: invoiceId
                      })
                    })
                    .then(res => res.json())
                    .then(result => {
                      if (!result.success) throw new Error(result.message || "Failed to delete invoice.");
                    });
                  }
                };
              }
            };
          }
        };
      }
    };
  }

  batch() {
    const operations = [];
    return {
      set: (docRef, data) => {
        operations.push({ type: 'set', docRef, data });
      },
      delete: (docRef) => {
        operations.push({ type: 'delete', docRef });
      },
      commit: () => {
        const user = firebaseAuth.currentUser;
        if (!user) return Promise.resolve();
        
        const promises = operations.map(op => {
          if (op.type === 'set') {
            return this.collection('users').doc(user.uid).collection('invoices').doc(op.data.id).set(op.data);
          } else if (op.type === 'delete') {
            return this.collection('users').doc(user.uid).collection('invoices').doc(op.docRef.id).delete();
          }
          return Promise.resolve();
        });
        return Promise.all(promises);
      }
    };
  }
}

function initializeGoogleSheetsDatabase() {
  firebaseAuth = new GoogleSheetsAuth();
  firebaseDb = new GoogleSheetsFirestore();
  isSandboxMode = false;
  console.log("Google Sheets Database Engine initialized successfully!");
}

// --- Firebase Engine & State Controllers ---
function initFirebase() {
  if (selectedBackend === 'google-sheets') {
    initializeGoogleSheetsDatabase();
    return;
  }

  if (selectedBackend === 'mock') {
    initializeMockFirebase();
    return;
  }

  if (typeof firebase === 'undefined') {
    console.warn("Firebase SDK libraries are not loaded. Running in local mock mode.");
    initializeMockFirebase();
    return;
  }

  let config = null;
  const localConfigStr = localStorage.getItem('invoicify_firebase_config');
  if (localConfigStr) {
    try {
      config = JSON.parse(localConfigStr);
      // Auto-heal: If the stored config is using the invalid dummy placeholder key, purge it
      if (config.apiKey === "AIzaSyDUY29Ecg5q65fgV3Nf-xvTXDkAIDVqhjQ" || config.apiKey === "YOUR_API_KEY") {
        localStorage.removeItem('invoicify_firebase_config');
        config = null;
      }
    } catch (e) { console.error(e); }
  }
  
  // Also check window config; if it has the invalid dummy placeholder, ignore it
  let windowConfig = window.firebaseConfig;
  if (windowConfig && (windowConfig.apiKey === "AIzaSyDUY29Ecg5q65fgV3Nf-xvTXDkAIDVqhjQ" || windowConfig.apiKey === "YOUR_API_KEY")) {
    windowConfig = null;
  }

  if (!config && windowConfig) {
    config = windowConfig;
  }

  if (config && config.apiKey && config.apiKey !== "YOUR_API_KEY") {
    try {
      if (firebase.apps.length === 0) {
        firebaseApp = firebase.initializeApp(config);
      } else {
        firebaseApp = firebase.app();
      }
      firebaseAuth = firebase.auth();
      firebaseDb = firebase.firestore();
      isSandboxMode = false;
      console.log("Real Firebase initialized successfully!");
    } catch (error) {
      console.error("Real Firebase init failed, switching to Local Mock Engine", error);
      initializeMockFirebase();
    }
  } else {
    initializeMockFirebase();
  }
}

function enableSandboxMode(triggerToast = true) {
  isSandboxMode = true;
  elements.authScreen.classList.add('hidden');
  elements.sandboxBanner.classList.remove('hidden');
  elements.userProfileBadge.classList.add('hidden');
  elements.btnLogout.classList.add('hidden');
  
  loadHistoryFromStorage();
  updateHistoryUI();
  updateAnalyticsDashboard();
  
  if (triggerToast) {
    showToast("Sandbox Demo Mode active. Work stored locally.", "info");
  }
}

function listenToAuthState() {
  if (!firebaseAuth) return;
  
  firebaseAuth.onAuthStateChanged(user => {
    if (user) {
      isSandboxMode = false;
      elements.authScreen.classList.add('hidden');
      elements.sandboxBanner.classList.add('hidden');
      
      elements.userEmailDisplay.textContent = user.email;
      elements.userProfileBadge.classList.remove('hidden');
      elements.btnLogout.classList.remove('hidden');
      
      showToast(`Signed in as ${user.email}`, "success");
      
      // Sync offline drafts to Firestore
      syncLocalHistoryToCloud();
      
      // Load history
      loadHistoryFromFirestore();
    } else {
      elements.authScreen.classList.remove('hidden');
      elements.userProfileBadge.classList.add('hidden');
      elements.btnLogout.classList.add('hidden');
      elements.sandboxBanner.classList.add('hidden');
      
      invoiceHistory = [];
      updateHistoryUI();
      updateAnalyticsDashboard();
    }
  });
}

function setupFirebaseEventListeners() {
  // Tab toggling
  elements.tabSignin.addEventListener('click', () => {
    authMode = 'signin';
    elements.tabSignin.classList.add('active');
    elements.tabSignup.classList.remove('active');
    elements.btnAuthSubmit.querySelector('span:first-child').textContent = 'Sign In';
    elements.btnAuthSubmit.querySelector('.material-icons-round').textContent = 'login';
    elements.authErrorBanner.classList.add('hidden');
  });

  elements.tabSignup.addEventListener('click', () => {
    authMode = 'signup';
    elements.tabSignup.classList.add('active');
    elements.tabSignin.classList.remove('active');
    elements.btnAuthSubmit.querySelector('span:first-child').textContent = 'Sign Up';
    elements.btnAuthSubmit.querySelector('.material-icons-round').textContent = 'person_add';
    elements.authErrorBanner.classList.add('hidden');
  });

  elements.authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value.trim();

    elements.btnAuthSubmit.disabled = true;
    elements.btnAuthSubmit.querySelector('span:first-child').textContent = authMode === 'signin' ? 'Signing In...' : 'Signing Up...';

    const handleAuthError = (err, mode) => {
      console.error(`${mode} error`, err);
      let friendlyMsg = err.message || `${mode === 'signin' ? 'Sign in' : 'Registration'} failed.`;
      
      if (friendlyMsg.toLowerCase().includes("failed to fetch") || 
          friendlyMsg.toLowerCase().includes("network") || 
          friendlyMsg.toLowerCase().includes("communicate")) {
        
        friendlyMsg = `<div style="text-align: left;">` +
          `<strong style="color: hsl(350, 89%, 68%); display: flex; align-items: center; gap: 0.25rem;">` +
          `<span class="material-icons-round" style="font-size: 16px;">wifi_off</span> Network / CORS Error</strong>` +
          `<p style="margin: 0.25rem 0 0.5rem 0; font-size: 0.75rem; line-height: 1.3; color: rgba(255,255,255,0.7);">` +
          `Could not reach the database. Choose a fast local fallback below:</p>` +
          `<div class="error-banner-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">` +
          `  <button type="button" id="btn-err-fallback-mock" style="background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: white; padding: 0.3rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: 4px; cursor: pointer; transition: all 0.2s;">Use Local Mock DB</button>` +
          `  <button type="button" id="btn-err-fallback-sandbox" style="background: var(--color-accent); border: none; color: white; padding: 0.3rem 0.6rem; font-size: 0.7rem; font-weight: 600; border-radius: 4px; cursor: pointer; transition: all 0.2s;">Demo Sandbox</button>` +
          `</div>` +
          `</div>`;
          
        elements.authErrorMsg.innerHTML = friendlyMsg;
        
        setTimeout(() => {
          const btnMock = document.getElementById('btn-err-fallback-mock');
          const btnSandbox = document.getElementById('btn-err-fallback-sandbox');
          if (btnMock) {
            btnMock.addEventListener('click', () => {
              localStorage.setItem('invoicify_backend_type', 'mock');
              showToast("Switching to Local Mock DB... Reloading...", "success");
              setTimeout(() => window.location.reload(), 1000);
            });
          }
          if (btnSandbox) {
            btnSandbox.addEventListener('click', () => {
              enableSandboxMode(true);
            });
          }
        }, 50);
      } else {
        elements.authErrorMsg.textContent = friendlyMsg;
      }
      elements.authErrorBanner.classList.remove('hidden');
    };

    if (authMode === 'signin') {
      firebaseAuth.signInWithEmailAndPassword(email, password)
        .then(() => {
          showToast("Welcome back!", "success");
          elements.authErrorBanner.classList.add('hidden');
          elements.authForm.reset();
        })
        .catch(err => {
          handleAuthError(err, 'signin');
        })
        .finally(() => {
          elements.btnAuthSubmit.disabled = false;
          elements.btnAuthSubmit.querySelector('span:first-child').textContent = 'Sign In';
        });
    } else {
      firebaseAuth.createUserWithEmailAndPassword(email, password)
        .then(() => {
          showToast("Account created successfully!", "success");
          elements.authErrorBanner.classList.add('hidden');
          elements.authForm.reset();
        })
        .catch(err => {
          handleAuthError(err, 'signup');
        })
        .finally(() => {
          elements.btnAuthSubmit.disabled = false;
          elements.btnAuthSubmit.querySelector('span:first-child').textContent = 'Sign Up';
        });
    }
  });

  // Sandbox linkages
  elements.linkSandbox.addEventListener('click', (e) => {
    e.preventDefault();
    enableSandboxMode(true);
  });

  elements.linkSetupFirebase.addEventListener('click', (e) => {
    e.preventDefault();
    isSandboxMode = false;
    elements.authScreen.classList.remove('hidden');
    if (!isConfigPanelExpanded) {
      elements.btnConfigToggle.click();
    }
  });

  // Config panel toggle
  elements.btnConfigToggle.addEventListener('click', () => {
    isConfigPanelExpanded = !isConfigPanelExpanded;
    elements.btnConfigToggle.classList.toggle('active', isConfigPanelExpanded);
    elements.configContent.classList.toggle('hidden', !isConfigPanelExpanded);
  });

  // Backend selector tab events
  elements.btnBackendFirebase.addEventListener('click', () => {
    selectedBackend = 'firebase';
    elements.btnBackendFirebase.classList.add('active');
    elements.btnBackendSheets.classList.remove('active');
    elements.btnBackendMock.classList.remove('active');
    elements.configFirebaseGroup.classList.remove('hidden');
    elements.configSheetsGroup.classList.add('hidden');
    elements.configMockGroup.classList.add('hidden');
  });

  elements.btnBackendSheets.addEventListener('click', () => {
    selectedBackend = 'google-sheets';
    elements.btnBackendSheets.classList.add('active');
    elements.btnBackendFirebase.classList.remove('active');
    elements.btnBackendMock.classList.remove('active');
    elements.configFirebaseGroup.classList.add('hidden');
    elements.configSheetsGroup.classList.remove('hidden');
    elements.configMockGroup.classList.add('hidden');
  });

  elements.btnBackendMock.addEventListener('click', () => {
    selectedBackend = 'mock';
    elements.btnBackendMock.classList.add('active');
    elements.btnBackendFirebase.classList.remove('active');
    elements.btnBackendSheets.classList.remove('active');
    elements.configFirebaseGroup.classList.add('hidden');
    elements.configSheetsGroup.classList.add('hidden');
    elements.configMockGroup.classList.remove('hidden');
  });

  // Save dynamic web config in panel
  elements.btnSaveConfig.addEventListener('click', () => {
    localStorage.setItem('invoicify_backend_type', selectedBackend);

    if (selectedBackend === 'google-sheets') {
      const sheetsUrl = elements.cfgSheetsUrl ? elements.cfgSheetsUrl.value.trim() : localStorage.getItem('invoicify_sheets_url');
      if (!sheetsUrl) {
        showToast("Please ensure your Google Sheets Apps Script URL is saved in the .env file.", "warning");
        return;
      }
      localStorage.setItem('invoicify_sheets_url', sheetsUrl);
      showToast("Google Sheets Config saved! Reloading application...", "success");
    } else if (selectedBackend === 'mock') {
      showToast("Local Mock DB enabled! Reloading application...", "success");
    } else {
      const apiKey = elements.cfgApiKey.value.trim();
      const authDomain = elements.cfgAuthDomain.value.trim();
      const projectId = elements.cfgProjectId.value.trim();
      const appId = elements.cfgAppId.value.trim();

      if (!apiKey || !authDomain || !projectId || !appId) {
        showToast("Please fill in all Firebase config fields.", "warning");
        return;
      }

      const config = { apiKey, authDomain, projectId, appId };
      localStorage.setItem('invoicify_firebase_config', JSON.stringify(config));
      showToast("Firebase Config saved! Reloading application...", "success");
    }
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  });

  // Populates Config Panel Inputs based on saved selections
  if (selectedBackend === 'google-sheets') {
    elements.btnBackendSheets.click();
  } else if (selectedBackend === 'mock') {
    elements.btnBackendMock.click();
  } else {
    elements.btnBackendFirebase.click();
  }

  const savedSheetsUrl = localStorage.getItem('invoicify_sheets_url');
  if (savedSheetsUrl && elements.cfgSheetsUrl) {
    elements.cfgSheetsUrl.value = savedSheetsUrl;
  }

  let savedConfig = null;
  const localConfigStr = localStorage.getItem('invoicify_firebase_config');
  if (localConfigStr) {
    try { savedConfig = JSON.parse(localConfigStr); } catch(e) {}
  }
  if (!savedConfig && window.firebaseConfig && window.firebaseConfig.apiKey !== "YOUR_API_KEY") {
    savedConfig = window.firebaseConfig;
  }
  if (savedConfig) {
    elements.cfgApiKey.value = savedConfig.apiKey || '';
    elements.cfgAuthDomain.value = savedConfig.authDomain || '';
    elements.cfgProjectId.value = savedConfig.projectId || '';
    elements.cfgAppId.value = savedConfig.appId || '';
  }

  elements.btnLogout.addEventListener('click', () => {
    if (confirm("Are you sure you want to sign out?")) {
      if (isSandboxMode) {
        // Return to welcome screen, exiting sandbox mode
        isSandboxMode = false;
        elements.authScreen.classList.remove('hidden');
        elements.sandboxBanner.classList.add('hidden');
        elements.userProfileBadge.classList.add('hidden');
        elements.btnLogout.classList.add('hidden');
        invoiceHistory = [];
        updateHistoryUI();
        updateAnalyticsDashboard();
        showToast("Exited Demo Sandbox Mode.", "info");
      } else {
        firebaseAuth.signOut().then(() => {
          showToast("Successfully signed out.", "success");
        }).catch(err => {
          showToast("Error signing out.", "error");
        });
      }
    }
  });
}
