import asyncio
import os
import sys
import io
import uuid
import json
import pytest
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, "backend")
sys.path.insert(0, "agent")

import app.models
from app.main import app
from app.core.database import AsyncSessionLocal
from app.modules.tenants.models import Shop
from app.modules.orders.models import Order, OrderState
from app.modules.queue.models import PrintJob, JobStatus
from app.modules.payments.models import Payment, PaymentStatus
from app.modules.documents.models import Document
from sqlalchemy import select, update


async def run_dry_runs():
    transport = ASGITransport(app=app)
    results = []

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Fetch Shop
        shop_res = await client.get("/api/v1/shops/campus-xerox")
        assert shop_res.status_code == 200, "Shop campus-xerox must exist"
        shop_data = shop_res.json()
        print(f"[DRY-RUN SETUP] Shop {shop_data['name']} active, B&W rate: {shop_data['pricing']['bw_per_page_cents']}c (₹{shop_data['pricing']['bw_per_page_cents']/100:.2f})")

        # -----------------------------------------------------------------
        # DRY RUN A: Simple 1-page PDF
        # -----------------------------------------------------------------
        with open("tests/fixtures/heds-test-1-page.pdf", "rb") as f:
            b1 = f.read()
        res_a = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("test_1.pdf", b1, "application/pdf")})
        doc_a = res_a.json()
        quote_a = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_a["document_id"], "copies": 1, "color_mode": "BW", "duplex": False, "paper_size": "A4", "page_range": "all"})).json()
        status_a = "PASS" if doc_a["page_count"] == 1 and quote_a["final_amount_cents"] == 100 else "FAIL"
        results.append({
            "test": "DRY RUN A — 1 Page PDF",
            "input": "1-page PDF, 1 copy, B&W",
            "expected": "page_count=1, Price=₹1.00 (100c)",
            "actual": f"page_count={doc_a['page_count']}, Price={quote_a['formatted_total']} ({quote_a['final_amount_cents']}c)",
            "status": status_a,
        })

        # -----------------------------------------------------------------
        # DRY RUN B: 3-page PDF (Testing previous ₹6 bug)
        # -----------------------------------------------------------------
        with open("tests/fixtures/heds-test-3-page.pdf", "rb") as f:
            b3 = f.read()
        res_b = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("test_3.pdf", b3, "application/pdf")})
        doc_b = res_b.json()
        quote_b = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_b["document_id"], "copies": 1, "color_mode": "BW", "duplex": False, "paper_size": "A4", "page_range": "all"})).json()
        status_b = "PASS" if doc_b["page_count"] == 3 and quote_b["final_amount_cents"] == 300 else "FAIL"
        results.append({
            "test": "DRY RUN B — 3 Page PDF",
            "input": "3-page PDF, 1 copy, B&W",
            "expected": "page_count=3, Price=₹3.00 (NOT ₹6.00)",
            "actual": f"page_count={doc_b['page_count']}, Price={quote_b['formatted_total']} ({quote_b['final_amount_cents']}c)",
            "status": status_b,
        })

        # -----------------------------------------------------------------
        # DRY RUN C: 11-page PDF
        # -----------------------------------------------------------------
        with open("tests/fixtures/heds-test-11-page.pdf", "rb") as f:
            b11 = f.read()
        res_c = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("test_11.pdf", b11, "application/pdf")})
        doc_c = res_c.json()
        quote_c = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_c["document_id"], "copies": 1, "color_mode": "BW", "duplex": False, "paper_size": "A4", "page_range": "all"})).json()
        status_c = "PASS" if doc_c["page_count"] == 11 and quote_c["final_amount_cents"] == 1100 else "FAIL"
        results.append({
            "test": "DRY RUN C — 11 Page PDF",
            "input": "11-page PDF, 1 copy, B&W",
            "expected": "page_count=11, Price=₹11.00 (1100c)",
            "actual": f"page_count={doc_c['page_count']}, Price={quote_c['formatted_total']} ({quote_c['final_amount_cents']}c)",
            "status": status_c,
        })

        # -----------------------------------------------------------------
        # DRY RUN D: 60-page PDF (Large Document)
        # -----------------------------------------------------------------
        with open("tests/fixtures/heds-test-60-page.pdf", "rb") as f:
            b60 = f.read()
        res_d = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("test_60.pdf", b60, "application/pdf")})
        doc_d = res_d.json()
        quote_d = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_d["document_id"], "copies": 1, "color_mode": "BW", "duplex": False, "paper_size": "A4", "page_range": "all"})).json()
        status_d = "PASS" if doc_d["page_count"] == 60 and quote_d["final_amount_cents"] == 6000 else "FAIL"
        results.append({
            "test": "DRY RUN D — 60 Page PDF",
            "input": "60-page PDF, 1 copy, B&W",
            "expected": "page_count=60, Price=₹60.00 (6000c)",
            "actual": f"page_count={doc_d['page_count']}, Price={quote_d['formatted_total']} ({quote_d['final_amount_cents']}c)",
            "status": status_d,
        })

        # -----------------------------------------------------------------
        # DRY RUN E: Copies (5-page PDF x 2 copies)
        # -----------------------------------------------------------------
        with open("tests/fixtures/heds-test-5-page.pdf", "rb") as f:
            b5 = f.read()
        res_e = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("test_5.pdf", b5, "application/pdf")})
        doc_e = res_e.json()
        quote_e = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_e["document_id"], "copies": 2, "color_mode": "BW", "duplex": False, "paper_size": "A4", "page_range": "all"})).json()
        status_e = "PASS" if doc_e["page_count"] == 5 and quote_e["final_amount_cents"] == 1000 else "FAIL"
        results.append({
            "test": "DRY RUN E — Copies Multiplier",
            "input": "5-page PDF, 2 copies, B&W",
            "expected": "page_count=5, billable=10, Price=₹10.00 (1000c)",
            "actual": f"billable={quote_e['active_pages']*quote_e['copies']}, Price={quote_e['formatted_total']} ({quote_e['final_amount_cents']}c)",
            "status": status_e,
        })

        # -----------------------------------------------------------------
        # DRY RUN F: Duplex (10-page document)
        # -----------------------------------------------------------------
        # Using 20-page document with range 1-10 for 10 pages duplex
        with open("tests/fixtures/heds-test-20-page.pdf", "rb") as f:
            b20 = f.read()
        res_f = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("test_20.pdf", b20, "application/pdf")})
        doc_f = res_f.json()
        quote_f = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_f["document_id"], "copies": 1, "color_mode": "BW", "duplex": True, "paper_size": "A4", "page_range": "1-10"})).json()
        status_f = "PASS" if quote_f["active_pages"] == 10 and quote_f["sheets_count"] == 5 and quote_f["final_amount_cents"] == 1000 else "FAIL"
        results.append({
            "test": "DRY RUN F — Duplex Printing",
            "input": "10 active pages, Duplex=ON, 1 copy",
            "expected": "10 pages billable, 5 physical sheets, Price=₹10.00",
            "actual": f"pages={quote_f['active_pages']}, sheets={quote_f['sheets_count']}, Price={quote_f['formatted_total']}",
            "status": status_f,
        })

        # -----------------------------------------------------------------
        # DRY RUN G: Page Range (20 pages, Range 1-5)
        # -----------------------------------------------------------------
        quote_g = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_f["document_id"], "copies": 1, "color_mode": "BW", "duplex": False, "paper_size": "A4", "page_range": "1-5"})).json()
        status_g = "PASS" if quote_g["active_pages"] == 5 and quote_g["final_amount_cents"] == 500 else "FAIL"
        results.append({
            "test": "DRY RUN G — Page Range Selection",
            "input": "20-page document, Range '1-5'",
            "expected": "selected_pages=5, Price=₹5.00 (500c)",
            "actual": f"selected_pages={quote_g['active_pages']}, Price={quote_g['formatted_total']} ({quote_g['final_amount_cents']}c)",
            "status": status_g,
        })

        # -----------------------------------------------------------------
        # DRY RUN H: Color (5-page PDF)
        # -----------------------------------------------------------------
        quote_h = (await client.post("/api/v1/shops/campus-xerox/pricing/quote", json={"document_id": doc_e["document_id"], "copies": 1, "color_mode": "COLOR", "duplex": False, "paper_size": "A4", "page_range": "all"})).json()
        status_h = "PASS" if quote_h["active_pages"] == 5 and quote_h["final_amount_cents"] == 5000 else "FAIL"
        results.append({
            "test": "DRY RUN H — Color Printing",
            "input": "5-page PDF, Color=ON at ₹10/page",
            "expected": "Price=₹50.00 (5000c)",
            "actual": f"Price={quote_h['formatted_total']} ({quote_h['final_amount_cents']}c)",
            "status": status_h,
        })

        # -----------------------------------------------------------------
        # DRY RUN I: Corrupted / Fake PDF Validation
        # -----------------------------------------------------------------
        fake_pdf_bytes = b"NOT A VALID PDF HEADER"
        res_i = await client.post("/api/v1/shops/campus-xerox/documents/upload", files={"file": ("fake.pdf", fake_pdf_bytes, "application/pdf")})
        status_i = "PASS" if res_i.status_code == 400 and "valid PDF header" in res_i.text else "FAIL"
        results.append({
            "test": "DRY RUN I — Corrupted / Fake PDF Rejection",
            "input": "Fake PDF bytes lacking %PDF- header",
            "expected": "HTTP 400 rejection, no document created",
            "actual": f"HTTP {res_i.status_code}: {res_i.text[:60]}...",
            "status": status_i,
        })

        # -----------------------------------------------------------------
        # DRY RUN J: Payment Failure Handling & Safe Retry
        # -----------------------------------------------------------------
        # Create an order with document_id
        ord_res_j = await client.post("/api/v1/shops/campus-xerox/orders", data={"document_id": doc_c["document_id"], "copies": "1", "color_mode": "BW", "duplex": "false", "paper_size": "A4", "page_range": "all"})
        ord_j = ord_res_j.json()
        token_j = ord_j["guest_access_token"]
        
        # Simulate payment failure
        pay_fail_res = await client.post(f"/api/v1/orders/{token_j}/payment", json={"simulate_status": "failed"})
        ord_check_j = (await client.get(f"/api/v1/orders/{token_j}")).json()
        
        # Retry payment with success
        pay_retry_res = await client.post(f"/api/v1/orders/{token_j}/payment", json={"simulate_status": "success"})
        ord_after_retry = (await client.get(f"/api/v1/orders/{token_j}")).json()
        
        status_j = "PASS" if ord_check_j["status"] == "PAYMENT_FAILED" and ord_after_retry["status"] in ["PAID", "QUEUED"] else "FAIL"
        results.append({
            "test": "DRY RUN J — Payment Failure & Retry",
            "input": "Simulated failed payment then retry",
            "expected": "Status transitions PAYMENT_FAILED -> QUEUED upon retry",
            "actual": f"Failed state: {ord_check_j['status']}, After retry: {ord_after_retry['status']}",
            "status": status_j,
        })

        # -----------------------------------------------------------------
        # DRY RUN K: Duplicate Payment Idempotency
        # -----------------------------------------------------------------
        pay_dup_res = await client.post(f"/api/v1/orders/{token_j}/payment", json={"simulate_status": "success"})
        status_k = "PASS" if pay_dup_res.status_code in [200, 400] and pay_dup_res.json().get("status") in ["SUCCESS", "PAID"] else "FAIL"
        results.append({
            "test": "DRY RUN K — Duplicate Payment Protection",
            "input": "Repeat payment attempt on already-paid order",
            "expected": "Idempotent success, zero duplicate jobs",
            "actual": f"HTTP {pay_dup_res.status_code}, status={pay_dup_res.json().get('status')}",
            "status": status_k,
        })

        # -----------------------------------------------------------------
        # DRY RUN L: Webhook Replay Protection
        # -----------------------------------------------------------------
        wh_event_id = str(uuid.uuid4())
        wh_payload = {"event_id": wh_event_id, "gateway_order_id": ord_j["id"], "event": "payment.captured"}
        wh_1 = await client.post("/api/v1/payments/webhook", json=wh_payload, headers={"Idempotency-Key": wh_event_id})
        wh_2 = await client.post("/api/v1/payments/webhook", json=wh_payload, headers={"Idempotency-Key": wh_event_id})
        status_l = "PASS" if wh_1.status_code == 200 and wh_2.status_code == 200 and wh_2.json().get("status") in ["SUCCESS", "PAID"] else "FAIL"
        results.append({
            "test": "DRY RUN L — Webhook Replay Protection",
            "input": "Send same webhook event twice with identical Idempotency-Key",
            "expected": "Second event returns cached success without duplicate queueing",
            "actual": f"First: HTTP {wh_1.status_code}, Second: HTTP {wh_2.status_code}",
            "status": status_l,
        })

        # -----------------------------------------------------------------
        # DRY RUN R: Pickup OTP Rate Limiting
        # -----------------------------------------------------------------
        # Login operator to get auth token
        login_res = await client.post("/api/v1/auth/login", json={"email": "operator@campus-xerox.local", "password": "operator123"})
        op_token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {op_token}"}

        # First transition order to PICKUP_READY so pickup record exists
        from app.modules.pickups.service import pickup_service
        async with AsyncSessionLocal() as s:
            o_rec = (await s.execute(select(Order).where(Order.id == uuid.UUID(ord_j["id"])))).scalar_one()
            o_rec.status = OrderState.PRINT_COMPLETED
            await pickup_service.create_privacy_hold(session=s, order=o_rec)
            await s.commit()

        # Attempt 6 wrong OTPs on the order
        otp_statuses = []
        for i in range(6):
            r_otp = await client.post(
                "/api/v1/pickups/confirm",
                json={"order_id": ord_j["id"], "otp": f"99999{i}"},
                headers=auth_headers,
            )
            otp_statuses.append(r_otp.status_code)
        
        status_r = "PASS" if 400 in otp_statuses and any("rate limit" in r_otp.text.lower() or r_otp.status_code == 400 for _ in [1]) else "FAIL"
        # Check if rate limit error message was returned
        rate_limited = any("rate limit" in str(r_otp.text).lower() for _ in [1])
        if not rate_limited:
            # Let's inspect last response
            last_err = r_otp.text
        else:
            last_err = "Rate limit reached"
        status_r = "PASS" if "rate limit" in r_otp.text.lower() or "too many failed" in r_otp.text.lower() else "FAIL"

        results.append({
            "test": "DRY RUN R — Counter OTP Rate Limiting",
            "input": "6 consecutive invalid OTP guesses by counter operator",
            "expected": "OTP rate limit triggered after 5 failed attempts",
            "actual": f"Last status: HTTP {r_otp.status_code}, message: {r_otp.text}",
            "status": status_r,
        })

    return results

if __name__ == "__main__":
    res = asyncio.run(run_dry_runs())
    print("\n" + "="*80)
    print("  HEDS DRY RUN VERIFICATION RESULTS")
    print("="*80)
    for r in res:
        print(f"[{r['status']}] {r['test']}")
        print(f"       Input:    {r['input']}")
        print(f"       Expected: {r['expected']}")
        print(f"       Actual:   {r['actual']}")
    print("="*80)
