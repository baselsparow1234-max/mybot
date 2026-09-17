const TELEGRAM_BOT_TOKEN = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const TELEGRAM_CHAT_ID = "8298812929";
const FIREBASE_DB_URL = "https://chekinroad-afa14-default-rtdb.firebaseio.com";

function getLoggedInUser() {
    let u = localStorage.getItem('brt_user') || "";

    const inputElement = document.getElementById('usernameInput');
    if (inputElement && inputElement.value.trim() !== "") {
        u = inputElement.value.trim();
    }

    if (typeof u === 'string') {
        u = u.replace(/"/g, '').trim();
    }
    return u;
}

// جلب الرصيد إن وجد في الفايربيس
async function loadUserBalance() {
    const rawUser = getLoggedInUser();
    const balanceElement = document.getElementById('userCurrentBalance');
    const inputElement = document.getElementById('usernameInput');

    if (inputElement && !inputElement.value && rawUser) {
        inputElement.value = rawUser;
    }

    if (!rawUser) {
        if (balanceElement) balanceElement.innerText = "0.00";
        return;
    }

    const cleanUser = rawUser.replace(/[^a-zA-Z0-9]/g, "_");

    try {
        const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');
        const res = await fetch(`${cleanDbUrl}/users/${cleanUser}.json`);
        const userData = await res.json();

        let currentBalance = 0;

        if (userData !== null) {
            if (typeof userData === 'object') {
                currentBalance = userData.balance ?? userData.amount ?? userData.wallet ?? 0;
            } else if (typeof userData === 'number' || typeof userData === 'string') {
                currentBalance = userData;
            }
        }

        if (balanceElement) {
            balanceElement.innerText = parseFloat(currentBalance || 0).toFixed(2);
        }
    } catch (e) {
        console.error("خطأ في جلب الرصيد:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserBalance();
});

// إرسال طلب السحب للتليجرام مباشرة
async function submitWithdrawal() {
    const rawUser = getLoggedInUser();

    if (!rawUser) {
        alert("❌ يرجى إدخال اسم حسابك أولاً.");
        return;
    }

    const cleanUser = rawUser.replace(/[^a-zA-Z0-9]/g, "_");

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

    const messageText = `📤 **طلب سحب جديد**\n\n` +
                        `👤 **المستخدم:** ${rawUser}\n` +
                        `💰 **المبلغ المطلوب:** ${amount} USDT\n` +
                        `🌐 **الشبكة:** ${network}\n` +
                        `🏦 **العنوان:** \`${address}\``;

    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "✅ موافقة وخصم الرصيد", callback_data: `wapprove:${cleanUser}:${amount}` },
                { text: "❌ رفض الطلب", callback_data: `wreject:${cleanUser}` }
            ]
        ]
    };

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: "Markdown",
                reply_markup: replyMarkup
            })
        });

        const data = await response.json();

        if (data.ok) {
            alert("✅ تم إرسال طلب السحب بنجاح إلى التليجرام!");
            window.location.href = "home.html";
        } else {
            alert("❌ حدث خطأ أثناء إرسال الطلب.");
        }
    } catch (error) {
        console.error("خطأ في إرسال طلب السحب:", error);
        alert("حدث خطأ في الاتصال.");
    }
}
