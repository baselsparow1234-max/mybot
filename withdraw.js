const TELEGRAM_BOT_TOKEN = "8811735698:AAEIYziXQiaFE7Qxv5oxSywaCbzp8mi-IzA";
const TELEGRAM_CHAT_ID = "8298812929";
const FIREBASE_DB_URL = "https://chekinroad-afa14-default-rtdb.firebaseio.com";

// قراءة اسم الحساب المباشر وتنظيفه بنفس طريقة الإيداع
function getUserName() {
    let u = localStorage.getItem('brt_user') || localStorage.getItem('user') || localStorage.getItem('email') || "dtt";
    if (typeof u === 'string') {
        u = u.replace(/"/g, '').trim();
    }
    return u || "dtt";
}

const rawUser = getUserName();
// تنظيف الاسم تماماً كما يفعل ملف deposit.js
const currentUser = rawUser.replace(/[^a-zA-Z0-9]/g, "_");

// 1. جلب الرصيد الحقيقي وعرضه في الصفحة عند التحميل
async function loadUserBalance() {
    try {
        const cleanDbUrl = FIREBASE_DB_URL.replace(/\/+$/, '');
        const res = await fetch(`${cleanDbUrl}/users/${currentUser}/balance.json`);
        const balance = await res.json();
        
        const balanceElement = document.getElementById('userCurrentBalance');
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

// تشغيل الجلب فور فتح الصفحة
document.addEventListener('DOMContentLoaded', loadUserBalance);
loadUserBalance();

// 2. إرسال طلب السحب للتليجرام مطبقاً نفس هيكلية الإيداع
async function submitWithdrawal() {
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
                        `👤 **المستخدم:** ${currentUser}\n` +
                        `💰 **المبلغ المطلوب:** ${amount} USDT\n` +
                        `🌐 **الشبكة:** ${network}\n` +
                        `🏦 **العنوان:** \`${address}\``;

    // تطابق مع مفاتيح wapprove و wreject المعالجة في index.js
    const replyMarkup = {
        inline_keyboard: [
            [
                { text: "✅ موافقة وخصم الرصيد", callback_data: `wapprove:${currentUser}:${amount}` },
                { text: "❌ رفض الطلب", callback_data: `wreject:${currentUser}` }
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
