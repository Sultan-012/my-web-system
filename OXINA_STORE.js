// Array to store cart elements
let cart = [];

function proceedToCheckout() {
    let cartCount = 0;
    
    if (typeof cart !== 'undefined' && Array.isArray(cart)) {
        cartCount = cart.length;
    } else {
        const badge = document.querySelector('.cart-badge');
        if (badge) {
            cartCount = parseInt(badge.textContent) || 0;
        }
    }

    if (cartCount > 0) {
        const checkoutSection = document.getElementById('checkout') || document.querySelector('.checkout-grid');
        
        if (checkoutSection) {
            checkoutSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.location.href = '#checkout';
        }

        // ==========================================
        // 🟢 تيك توك بكسل: حدث "البدء بالدفع"
        // ==========================================
        if (typeof ttq !== 'undefined') {
            let checkoutTotal = Number(cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2));
            
            let contentsArray = cart.map(item => ({
                "content_id": item.title, // 👈 تم إضافة المعرف هنا
                "content_type": "product",
                "content_name": item.title,
                "quantity": item.qty,
                "price": item.price 
            }));

            ttq.track('InitiateCheckout', {
                "contents": contentsArray,
                "value": checkoutTotal, 
                "currency": "SAR"
            });
        }
        // ==========================================

    } else {
        alert('السلة فارغة حالياً! يرجى اختيار أحد العروض وإضافته للسلة أولاً.');
    }
}

function scrollSlider(containerId, distance) {
    const container = document.getElementById(containerId);
    container.scrollBy({ left: distance, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', function() {
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        setTimeout(function() {
            heroSection.classList.add('appear');
        }, 100);
    }

    if (typeof ttq !== 'undefined') {
        ttq.track('ViewContent', {
            "value": 0,
            "currency": "SAR"
        });
    }
});

// Add Offer/Product to Cart
function addToCart(title, price) {
    const cleanPrice = parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;

    const existingItem = cart.find(item => item.title === title);
    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({ title: title, price: cleanPrice, qty: 1 });
    }
    updateCartUI();

    // ==========================================
    // 🟢 تيك توك بكسل: حدث "الإضافة للسلة"
    // ==========================================
    if (typeof ttq !== 'undefined') {
        ttq.track('AddToCart', {
            "contents": [
                {
                    "content_id": title, // 👈 تم إضافة المعرف هنا
                    "content_type": "product",
                    "content_name": title,
                    "price": cleanPrice 
                }
            ],
            "value": cleanPrice,
            "currency": "SAR"
        });
    }
}

// Change item quantity
function updateQty(index, change) {
    cart[index].qty += change;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

// Update UI View for Cart
function updateCartUI() {
    const listContainer = document.getElementById('cartItemsList');
    const cartBadge = document.getElementById('cartBadge');
    const cartTotalPrice = document.getElementById('cartTotalPrice');

    if (cart.length === 0) {
        listContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); margin: 20px 0;">السلة فارغة حالياً. أضف بعض العروض من الأعلى!</p>`;
        cartBadge.innerText = "0";
        cartTotalPrice.innerText = "0 ريال";
        return;
    }

    let html = '';
    let totalCost = 0;
    let totalItemsCount = 0;

    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.qty;
        totalCost += itemTotal;
        totalItemsCount += item.qty;

        html += `
            <div class="cart-item">
                <div>
                    <div style="font-weight:700; color:var(--primary);">${item.title}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">${item.price} ريال × ${item.qty} = ${itemTotal} ريال</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty(${idx}, -1)">-</button>
                    <span style="font-weight:bold;">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${idx}, 1)">+</button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
    cartBadge.innerText = totalItemsCount;
    cartTotalPrice.innerText = `${totalCost} ريال`;
}

// Submit complete sales invoice to WhatsApp sales team
document.getElementById('orderForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert("يرجى إضافة عرض واحد على الأقل للسلة قبل إرسال الفاتورة!");
        return;
    }

    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    const city = document.getElementById('userCity').value;

    const salesWhatsAppNumber = "966561245965"; 

    let invoiceItemsText = "";
    let grandTotal = Number(cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2));
    
    let ttqContents = []; 

    cart.forEach((item, i) => {
        const subTotal = item.price * item.qty;
        invoiceItemsText += `%0A  ${i + 1}. *${item.title}* (الكمية: ${item.qty}) - السعر: ${subTotal} ريال`;
        
        ttqContents.push({
            "content_id": item.title, // 👈 تم إضافة المعرف هنا
            "content_type": "product",
            "content_name": item.title,
            "quantity": item.qty,
            "price": item.price
        });
    });

    // ==========================================
    // 🟢 تيك توك بكسل: أحداث الشراء
    // ==========================================
    if (typeof ttq !== 'undefined') {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(phone);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashedPhone = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            ttq.identify({
                "phone_number": hashedPhone
            });

            ttq.track('PlaceAnOrder', {
                "contents": ttqContents,
                "value": grandTotal, 
                "currency": "SAR"
            });
            
            ttq.track('Purchase', {
                "contents": ttqContents,
                "value": grandTotal, 
                "currency": "SAR"
            });
        } catch (error) {
            console.error("TikTok Pixel Error:", error);
        }
    }

    const invoiceMsg = 
        `🧾 *فاتورة طلب جديدة - متجر أوكسينا OXYNA*%0A` +
        `----------------------------------%0A` +
        `👤 *بيانات الزبون:*%0A` +
        `• *الاسم:* ${name}%0A` +
        `• *رقم الجوال:* ${phone}%0A` +
        `• *المدينة والعنوان:* ${city}%0A` +
        `----------------------------------%0A` +
        `📦 *تفاصيل الفاتورة والمشتريات:*` + 
        `${invoiceItemsText}%0A` +
        `----------------------------------%0A` +
        `💰 *الإجمالي النهائي:* ${grandTotal} ريال سعودي (شحن مجاني)%0A%0A` +
        `📞 *يرجى التواصل مع الزبون للتأكيد والشحن.*`;

    window.open(`https://wa.me/${salesWhatsAppNumber}?text=${invoiceMsg}`, '_blank');
});
