const TELEGRAM_BOT_TOKEN = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const TELEGRAM_CHAT_ID = "8298812929";
const FIREBASE_DB_URL = "https://chekinroad-afa14-default-rtdb.firebaseio.com";

function getUserName() {
    const inputElement = document.getElementById('usernameInput');
    if (inputElement && inputElement.value.trim() !== '') {
        return inputElement.value.trim();
    }
    
    let u = localStorage.getItem('brt_user') || 
            localStorage.getItem('user') || 
            localStorage.getItem('username') || 
            localStorage.getItem('email') || "";
            
    if (typeof u === 'string') {
        u = u.replace(/"/g, '').trim();
    }
    return u;
}

// جلب الرصيد الحقيقي من الفايربيس
async function loadUserBalance() {
    const rawUser = getUserName();
    const balanceElement = document.getElementById('userCurrentBalance');

    if (!rawUser) {
        if (balanceElement) balanceElement.innerText = "0.00";
        return;
    }

    // تنظيف الاسم ليبحث عنه بنفس هيكلية الفايربيس Exactly
    const currentUser = rawUser.replace(/[^a-zA-Z0-9]/g, "_");

    try {
        const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');
        const res = await fetch(`${cleanDbUrl}/users/${currentUser}/balance.json`);
        const balance = await res.json();
        
        if (balanceElement) {
            if (balance !== null && balance !== undefined) {
                balanceElement.innerText = parseFloat(balance).toFixed(2);
            } else {
                balanceElement.innerText = "0.00";
            }
        }
    } catch (e) {
        console.error("خطأ في جلب الرصيد:", e);
    }
}

// تحميل تلقائي للذاكرة إن وجدت
document.addEventListener('DOMContentLoaded', () => {
    let storedUser = localStorage.getItem('brt_user') || localStorage.getItem('user') || localStorage.getItem('email') || "";
    if (storedUser) {
        storedUser = storedUser.replace(/"/g, '').trim();
        const inputElement = document.getElementById('usernameInput');
        if (inputElement) inputElement.value = storedUser;
    }
    loadUserBalance();
});

// إرسال الطلب إلى التليجرام
async function submitWithdrawal() {
    const rawUser = getUserName();

    if (!rawUser) {
        alert("يرجى إدخال اسم حسابك أولاً.");
        return;
    }

    const currentUser = rawUser.replace(/[^a-zA-Z0-9]/g, "_");
    const amountInput = document.getElementById('withdrawAmount');
    const addressInput = document.getElementById('walletAddress');
    const networkInput = document.getElementById('withdrawNetwork');

    const amount = parseFloat(amountInput ? amountInput.value : 0);
    const address = addressInput ? addressInput.value.trim() : "";
    const network = networkInput ? networkInput.value : "TRC20";

    if (!amount || amount <= 0) {
        alert("يرجى إدخال مبلغ سحب صحيح.");
        return;
    }

    if (!address) {
        alert("يرجى إدخال عنوان المحفظة.");
        return;
    }

    const balanceElement = document.getElementById('userCurrentBalance');
    const currentBalance = balanceElement ? parseFloat(balanceElement.innerText) : 0;
    
    if (amount > currentBalance) {
        alert("❌ المبلغ المطلوب أكبر من رصيدك الحالي!");
        return;
    }

    const messageText = `📤 **طلب سحب جديد**\n\n` +
                        `👤 **المستخدم:** ${currentUser}\n` +
                        `💰 **المبلغ المطلوب:** ${amount} USDT\n` +
                        `🌐 **الشبكة:** ${network}\n` +
                        `🏦 **العنوان:** \`${address}\``;

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "✅ موافقة وخصم الرصيد", callback_data: `wapprove:${currentUser}:${amount}` },
                { text: "❌ رفض الطلب", callback_data: `wreject:${currentUser}:${amount}` }
            ]
        ]
    };

    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: "Markdown",
                reply_markup: replyMarkup
            })
        });

        const data = await res.json();

        if (data.ok) {
            alert("✅ تم إرسال طلب السحب بنجاح إلى التليجرام!");
            window.location.href = "home.html";
        } else {
            alert("❌ حدث خطأ أثناء إرسال الطلب للتليجرام.");
        }
    } catch (error) {
        console.error("خطأ في إرسال الطلب:", error);
        alert("حدث خطأ في الاتصال.");
    }
}
