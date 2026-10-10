
    async function loadReceipts() {
        const container = document.getElementById('receiptsContainer');
        try {
            const response = await fetch('/admin/receipts');
            const receipts = await response.json();

            if (!receipts || receipts.length === 0) {
                container.innerHTML = "<p style='text-align:center; width:100%;'>እስካሁን ምንም የተላከ የደረሰኝ ምስል የለም።</p>";
                return;
            }

            container.innerHTML = "";
            receipts.forEach(receipt => {
                const card = `
                    <div class="receipt-card">
                        <img src="${receipt.url}" alt="Receipt" onclick="window.open(this.src)">
                        <p><strong>ተጠቃሚ:</strong> ${receipt.username}</p>
                        <p><strong>አገልግሎት:</strong> ${receipt.serviceName}</p>
                        <div class="btn-group">
                            <button class="approve" onclick="approvePayment('${receipt._id}', '${receipt.username}', '${receipt.serviceName}')">አጽድቅ</button>
                            <button class="reject" onclick="rejectPayment('${receipt.serviceName}', '${receipt.username}')">ውድቅ አድርግ</button>
                        </div>
                    </div>
                `;
                container.innerHTML += card;
            });
        } catch (error) {
            console.error("ምስሎችን መጫን አልተቻለም:", error);
            container.innerHTML = "<p>መረጃውን መጫን አልተቻለም። ሰርቨሩ መብራቱን አረጋግጥ።</p>";
        }
    }

    // ማጽደቂያ
    async function approvePayment(id, username, serviceName) {
        if(!confirm(serviceName + " ክፍያ ይጽደቅ?")) return;

        try {
            const response = await fetch('/admin/approve-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, username, serviceName })
            });

            const result = await response.json();
            if (result.success) {
                alert("ክፍያው ጸድቋል! ተጠቃሚው 'Open' በተን ያገኛል።");
                location.reload();
            }
        } catch (error) {
            alert("ማጽደቅ አልተቻለም።");
        }
    }

    // ውድቅ ማድረጊያ (ቀደም ብለን የሰራነው)
    async function rejectPayment(serviceName, username) {
        const reason = prompt("ለምን ውድቅ ተደረገ?");
        if (!reason) return;

        try {
            const response = await fetch('/admin/reject-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceName, username, reason })
            });
            if (response.ok) {
                alert("ውድቅ ተደርጓል።");
                location.reload();
            }
        } catch (err) { alert("ስህተት ተፈጥሯል"); }
    }

    window.onload = loadReceipts;
