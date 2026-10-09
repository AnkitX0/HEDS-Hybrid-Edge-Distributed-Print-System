import sys
import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta

# Add backend to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import SyncSessionLocal
from app.core.security import hash_password, generate_guest_order_token
from app.modules.agents.service import AgentService
from app.models import (
    Tenant,
    TenantStatus,
    Shop,
    ShopMember,
    ShopMemberRole,
    User,
    UserRole,
    PricingRule,
    Document,
    Order,
    OrderState,
    PrintSpecification,
    ColorMode,
    Orientation,
    Scaling,
    Payment,
    PaymentStatus,
    PaymentGatewayType,
    Agent,
    AgentStatus,
    Printer,
    PrinterStatus,
    PrinterAdapterType,
    PrintJob,
    JobStatus,
    Pickup,
    AuditLog,
)


def seed_demo():
    from app.core.config import settings
    env = (getattr(settings, "ENVIRONMENT", getattr(settings, "APP_ENV", "development"))).lower()
    if env in ("production", "prod") and "--confirm-reset-production" not in sys.argv:
        print("[DEMO SEED ERROR] Refusing to wipe database in PRODUCTION environment without --confirm-reset-production flag.")
        sys.exit(1)

    session = SyncSessionLocal()
    try:
        print("[DEMO SEED] Resetting database to clean demonstration state...")
        # Clear tables in reverse dependency order
        session.query(Pickup).delete()
        session.query(PrintJob).delete()
        session.query(Payment).delete()
        session.query(PrintSpecification).delete()
        session.query(Order).delete()
        session.query(Document).delete()
        session.query(PricingRule).delete()
        session.query(Printer).delete()
        session.query(Agent).delete()
        session.query(ShopMember).delete()
        session.query(User).delete()
        session.query(Shop).delete()
        session.query(Tenant).delete()
        session.query(AuditLog).delete()
        session.commit()

        now = datetime.now(timezone.utc)

        print("[DEMO SEED] Creating Tenant: Campus Print Services Ltd...")
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Campus Print Services Ltd",
            slug="campus-print-services",
            status=TenantStatus.ACTIVE,
        )
        session.add(tenant)
        session.flush()

        print("[DEMO SEED] Creating Shop: Campus Xerox & Print Hub...")
        demo_shop_id = uuid.UUID("b52a6ecb-5dbc-4e41-a8cb-88f05f68859a")
        shop = Shop(
            id=demo_shop_id,
            tenant_id=tenant.id,
            name="Campus Xerox & Print Hub",
            slug="campus-xerox",
            is_active=True,
            is_queue_paused=False,
        )
        session.add(shop)
        session.flush()


        print("[DEMO SEED] Creating Operator and Admin Users...")
        admin_pass = hash_password("admin123")
        op_pass = hash_password("operator123")

        u_admin = User(
            id=uuid.uuid4(),
            email="admin@campus-xerox.local",
            hashed_password=admin_pass,
            full_name="Rajesh Sharma (Shop Admin)",
            role=UserRole.SHOP_ADMIN,
        )
        u_operator = User(
            id=uuid.uuid4(),
            email="operator@campus-xerox.local",
            hashed_password=op_pass,
            full_name="Amit Kumar (Shop Operator)",
            role=UserRole.SHOP_OPERATOR,
        )
        session.add_all([u_admin, u_operator])
        session.flush()

        m1 = ShopMember(shop_id=shop.id, user_id=u_admin.id, role=ShopMemberRole.SHOP_ADMIN)
        m2 = ShopMember(shop_id=shop.id, user_id=u_operator.id, role=ShopMemberRole.SHOP_OPERATOR)
        session.add_all([m1, m2])

        print("[DEMO SEED] Creating Authoritative Pricing Rules...")
        pricing_rule = PricingRule(
            shop_id=shop.id,
            name="Campus Standard Rates",
            paper_size="A4",
            bw_per_page_cents=100,      # ₹1.00 / page base rate
            color_per_page_cents=1000,  # ₹10.00 / page
            duplex_discount_cents=0,    # standard per-page policy
            minimum_order_cents=100,    # ₹1.00 base minimum
            is_active=True,
        )
        session.add(pricing_rule)
        session.flush()

        print("[DEMO SEED] Creating Edge Agents...")
        demo_agent_id = uuid.UUID("467674bf-343b-4484-adde-efc923c87db3")
        agent1_token = "agent-dev-key-12345"
        agent1 = Agent(
            id=demo_agent_id,
            shop_id=shop.id,
            name="campus-agent-01",
            agent_token_hash=AgentService.hash_agent_token(agent1_token),
            hostname="counter-pc-01",
            os_info="Ubuntu 22.04 LTS (x86_64)",
            version="0.1.0",
            status=AgentStatus.ONLINE,
            last_heartbeat_at=now - timedelta(seconds=8),
        )

        agent2 = Agent(
            id=uuid.uuid4(),
            shop_id=shop.id,
            name="campus-agent-02",
            agent_token_hash=AgentService.hash_agent_token("agent-backup-key-67890"),
            hostname="backoffice-pc-02",
            os_info="Ubuntu 22.04 LTS (x86_64)",
            version="0.1.0",
            status=AgentStatus.DEGRADED,
            last_heartbeat_at=now - timedelta(seconds=42),
        )
        agent_compat = Agent(
            id=uuid.uuid4(),
            shop_id=shop.id,
            name="Xerox-Counter-Linux-01",
            agent_token_hash=AgentService.hash_agent_token("agent-dev-key-12345"),
            hostname="counter-pc-01",
            os_info="Ubuntu 22.04 LTS",
            version="0.1.0",
            status=AgentStatus.ONLINE,
            last_heartbeat_at=now,
        )
        session.add_all([agent1, agent2, agent_compat])
        session.flush()

        print("[DEMO SEED] Creating 3 Printers (Xerox, HP, Canon)...")
        p_xerox = Printer(
            id=uuid.uuid4(),
            shop_id=shop.id,
            agent_id=agent1.id,
            name="Xerox WorkCentre 7830",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": True, "duplex": True, "paper_sizes": ["A4", "A3", "Letter"]},
        )
        p_hp = Printer(
            id=uuid.uuid4(),
            shop_id=shop.id,
            agent_id=agent1.id,
            name="HP LaserJet Pro",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": False, "duplex": True, "paper_sizes": ["A4", "Letter"]},
        )
        p_canon = Printer(
            id=uuid.uuid4(),
            shop_id=shop.id,
            agent_id=agent2.id,
            name="Canon imageRUNNER",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.ERROR,
            last_error="Needs attention - Paper jam in tray 2",
            capabilities_json={"color": True, "duplex": True, "paper_sizes": ["A4", "A3"]},
        )
        session.add_all([p_xerox, p_hp, p_canon])
        session.flush()

        print("[DEMO SEED] Seeding Orders and Queue State...")
        # Key demonstration orders
        # 1. HDS-1042: PRINTING (18 pages, B&W Duplex, Xerox WorkCentre 7830)
        # 2. HDS-1043: QUEUED (4 pages, B&W, HP LaserJet Pro)
        # 3. HDS-1044: QUEUED (26 pages, Color Duplex, Xerox WorkCentre 7830)
        # 4. HDS-1045: QUEUED (6 pages, B&W, HP LaserJet Pro)
        # 5. HDS-1040: PICKUP_READY (Token Ready)
        # 6. HDS-1046: PRINT_FAILED
        # 7. HDS-1047: RECONCILING
        # 8. HDS-1041: COMPLETED (id_document.pdf)
        # + 26 historical completed orders today to reach 27 completed and exactly ₹486.00 revenue

        specials = [
            {
                "order_num": "HDS-1042",
                "doc_name": "project_report.pdf",
                "pages": 18,
                "color": False,
                "duplex": True,
                "copies": 1,
                "cents": 3240,  # ₹32.40
                "state": OrderState.PRINTING,
                "job_state": JobStatus.PRINTING,
                "printer": p_xerox,
                "queued_offset": 5,
            },
            {
                "order_num": "HDS-1043",
                "doc_name": "resume_ankit.pdf",
                "pages": 4,
                "color": False,
                "duplex": False,
                "copies": 1,
                "cents": 800,  # ₹8.00
                "state": OrderState.QUEUED,
                "job_state": JobStatus.QUEUED,
                "printer": p_hp,
                "queued_offset": 4,
            },
            {
                "order_num": "HDS-1044",
                "doc_name": "lab_manual.pdf",
                "pages": 26,
                "color": True,
                "duplex": True,
                "copies": 1,
                "cents": 25000,  # ₹250.00
                "state": OrderState.QUEUED,
                "job_state": JobStatus.QUEUED,
                "printer": p_xerox,
                "queued_offset": 3,
            },
            {
                "order_num": "HDS-1045",
                "doc_name": "assignment_ml.pdf",
                "pages": 6,
                "color": False,
                "duplex": False,
                "copies": 1,
                "cents": 1200,  # ₹12.00
                "state": OrderState.QUEUED,
                "job_state": JobStatus.QUEUED,
                "printer": p_hp,
                "queued_offset": 2,
            },
            {
                "order_num": "HDS-1040",
                "doc_name": "internship_form.pdf",
                "pages": 2,
                "color": False,
                "duplex": False,
                "copies": 1,
                "cents": 400,  # ₹4.00
                "state": OrderState.PICKUP_READY,
                "job_state": JobStatus.COMPLETED,
                "printer": p_hp,
                "queued_offset": 12,
            },
            {
                "order_num": "HDS-1046",
                "doc_name": "exam_form.pdf",
                "pages": 2,
                "color": False,
                "duplex": False,
                "copies": 1,
                "cents": 400,
                "state": OrderState.PRINT_FAILED,
                "job_state": JobStatus.FAILED,
                "printer": p_canon,
                "queued_offset": 15,
                "error": "Paper Feed Sensor Timeout - Needs operator tray inspection",
            },
            {
                "order_num": "HDS-1047",
                "doc_name": "research_paper.pdf",
                "pages": 12,
                "color": False,
                "duplex": True,
                "copies": 1,
                "cents": 2160,
                "state": OrderState.RECONCILING,
                "job_state": JobStatus.RECONCILING,
                "printer": p_xerox,
                "queued_offset": 18,
                "error": "Ambiguous physical tray state mid-job - Operator reconciliation required",
            },
            {
                "order_num": "HDS-1041",
                "doc_name": "id_document.pdf",
                "pages": 2,
                "color": True,
                "duplex": False,
                "copies": 1,
                "cents": 2000,  # ₹20.00
                "state": OrderState.COMPLETED,
                "job_state": JobStatus.COMPLETED,
                "printer": p_xerox,
                "queued_offset": 25,
            },
        ]

        for s in specials:
            doc = Document(
                shop_id=shop.id,
                original_filename=s["doc_name"],
                sanitized_filename=s["doc_name"],
                storage_path=f"storage_data/{s['doc_name']}",
                mime_type="application/pdf",
                file_size_bytes=s["pages"] * 48000,
                page_count=s["pages"],
                checksum_sha256=secrets.token_hex(32),
            )
            session.add(doc)
            session.flush()

            order = Order(
                shop_id=shop.id,
                order_number=s["order_num"],
                guest_access_token=generate_guest_order_token(),
                document_id=doc.id,
                status=s["state"],
                total_amount_cents=s["cents"],
                currency="INR",
                pricing_breakdown_json={
                    "active_pages": s["pages"],
                    "copies": s["copies"],
                    "color_mode": "COLOR" if s["color"] else "BW",
                    "duplex": s["duplex"],
                    "final_amount_cents": s["cents"],
                    "formatted_total": f"₹{s['cents'] / 100:.2f}",
                },
                created_at=now - timedelta(minutes=s["queued_offset"]),
            )
            session.add(order)
            session.flush()

            spec = PrintSpecification(
                order_id=order.id,
                copies=s["copies"],
                color_mode=ColorMode.COLOR if s["color"] else ColorMode.BW,
                duplex=s["duplex"],
                paper_size="A4",
                page_range="all",
                orientation=Orientation.PORTRAIT,
                scaling=Scaling.FIT,
            )
            session.add(spec)

            payment = Payment(
                order_id=order.id,
                shop_id=shop.id,
                gateway=PaymentGatewayType.MOCK,
                gateway_payment_id=f"pay_mock_{secrets.token_hex(8)}",
                gateway_order_id=f"ord_mock_{secrets.token_hex(8)}",
                amount_cents=s["cents"],
                currency="INR",
                status=PaymentStatus.SUCCESS,
            )
            session.add(payment)

            job = PrintJob(
                order_id=order.id,
                shop_id=shop.id,
                printer_id=s["printer"].id,
                agent_id=s["printer"].agent_id or agent1.id,
                priority=10,
                status=s["job_state"],
                attempt_count=1 if s["job_state"] != JobStatus.QUEUED else 0,
                queued_at=order.created_at,
                error_message=s.get("error"),
            )
            session.add(job)

            if s["state"] in [OrderState.PICKUP_READY, OrderState.COMPLETED]:
                pickup = Pickup(
                    order_id=order.id,
                    shop_id=shop.id,
                    expires_at=now + timedelta(hours=24),
                )
                session.add(pickup)

        # Historical completed orders to bring completed count to 27 and revenue to ₹486.00
        # 1 completed already above (HDS-1041). We need 26 more.
        # Sum of revenue of active orders (HDS-1042, 1043, 1044, 1045, 1040, 1041) = 32,640 cents
        # Target total = 48,600 cents. Remaining = 15,960 cents across 26 orders.
        # 25 orders @ 638 cents = 15,312 cents. 1 order @ 648 cents. Total = 15,960 cents!
        completed_titles = [
            "Data_Structures_Assignment.pdf",
            "Operating_Systems_Syllabus.pdf",
            "Fee_Receipt_Term2.pdf",
            "Hostel_Verification_Slip.pdf",
            "Algorithms_CheatSheet.pdf",
            "Library_NOC_Form.pdf",
            "Bonafide_Certificate.pdf",
            "Physics_Lab_Report.pdf",
            "Chemistry_Formulas.pdf",
            "Maths_Tutorial_Sheet.pdf",
            "English_Essay_Draft.pdf",
            "Scholarship_Application.pdf",
            "Bus_Pass_Application.pdf",
            "Seminar_Presentation_Abstract.pdf",
            "Mini_Project_Synopsis.pdf",
            "Sports_Certificate.pdf",
            "Medical_Leave_Form.pdf",
            "Grade_Card_Semester_5.pdf",
            "Campus_Placement_Registration.pdf",
            "Club_Membership_Receipt.pdf",
            "Identity_Card_Copy.pdf",
            "Course_Feedback_Summary.pdf",
            "Workshop_Participation_Cert.pdf",
            "GATE_Admit_Card_2026.pdf",
            "Campus_Wi-Fi_Agreement.pdf",
            "Academic_Calendar_2026.pdf",
        ]

        for i, title in enumerate(completed_titles):
            cents = 648 if i == 0 else 638
            pages = max(2, cents // 200)

            doc = Document(
                shop_id=shop.id,
                original_filename=title,
                sanitized_filename=title,
                storage_path=f"storage_data/{title}",
                mime_type="application/pdf",
                file_size_bytes=pages * 42000,
                page_count=pages,
                checksum_sha256=secrets.token_hex(32),
            )
            session.add(doc)
            session.flush()

            order = Order(
                shop_id=shop.id,
                order_number=f"HDS-{1000 + i}",
                guest_access_token=generate_guest_order_token(),
                document_id=doc.id,
                status=OrderState.COMPLETED,
                total_amount_cents=cents,
                currency="INR",
                pricing_breakdown_json={
                    "active_pages": pages,
                    "copies": 1,
                    "color_mode": "BW",
                    "duplex": True,
                    "final_amount_cents": cents,
                    "formatted_total": f"₹{cents / 100:.2f}",
                },
                created_at=now - timedelta(hours=1, minutes=i * 12),
            )
            session.add(order)
            session.flush()

            spec = PrintSpecification(
                order_id=order.id,
                copies=1,
                color_mode=ColorMode.BW,
                duplex=True,
                paper_size="A4",
                page_range="all",
                orientation=Orientation.PORTRAIT,
                scaling=Scaling.FIT,
            )
            session.add(spec)

            payment = Payment(
                order_id=order.id,
                shop_id=shop.id,
                gateway=PaymentGatewayType.MOCK,
                gateway_payment_id=f"pay_mock_{secrets.token_hex(8)}",
                gateway_order_id=f"ord_mock_{secrets.token_hex(8)}",
                amount_cents=cents,
                currency="INR",
                status=PaymentStatus.SUCCESS,
            )
            session.add(payment)

            job = PrintJob(
                order_id=order.id,
                shop_id=shop.id,
                printer_id=p_xerox.id if i % 2 == 0 else p_hp.id,
                agent_id=agent1.id,
                priority=10,
                status=JobStatus.COMPLETED,
                attempt_count=1,
                queued_at=order.created_at,
            )
            session.add(job)

            pickup = Pickup(
                order_id=order.id,
                shop_id=shop.id,
                expires_at=now + timedelta(hours=24),
                confirmed_at=order.created_at + timedelta(minutes=5),
                confirmed_by_user_id=u_operator.id,
            )
            session.add(pickup)

        print("[DEMO SEED] Seeding Realistic Operational Activity Logs...")
        audit_events = [
            ("USER", "Amit Kumar", "ORDER_PICKUP_CONFIRMED", "Order", "HDS-1041", {"note": "Job HDS-1041 completed and verified"}, now - timedelta(minutes=1)),
            ("AGENT", "campus-agent-01", "PRINT_JOB_STARTED", "PrintJob", "HDS-1042", {"printer": "Xerox WorkCentre 7830", "note": "Job HDS-1042 started printing"}, now - timedelta(minutes=2)),
            ("SYSTEM", "PaymentGateway", "PAYMENT_SETTLED", "Payment", "HDS-1042", {"amount": 3240, "note": "Payment verified for HDS-1042"}, now - timedelta(minutes=3)),
            ("AGENT", "campus-agent-01", "AGENT_HEARTBEAT", "Agent", "campus-agent-01", {"status": "ONLINE", "queue_depth": 1, "note": "Agent campus-agent-01 heartbeat received"}, now - timedelta(minutes=4)),
            ("SYSTEM", "PickupService", "PICKUP_READY", "Order", "HDS-1040", {"pickup_ready": True, "note": "Job HDS-1040 ready for counter collection"}, now - timedelta(minutes=5)),
        ]

        for actor_type, actor_id, action, res_type, res_id, metadata, timestamp in audit_events:
            audit = AuditLog(
                id=uuid.uuid4(),
                tenant_id=tenant.id,
                shop_id=shop.id,
                actor_type=actor_type,
                actor_id=actor_id,
                action=action,
                resource_type=res_type,
                resource_id=res_id,
                metadata_json=metadata,
                created_at=timestamp,
            )
            session.add(audit)

        session.commit()
        print("\n=======================================================")
        print("  HEDS DEMONSTRATION ENVIRONMENT SEEDED SUCCESSFULLY")
        print("=======================================================")
        print(f"Shop:      Campus Xerox & Print Hub (Slug: {shop.slug})")
        print(f"Metrics:   3 In Queue | 1 Printing | 27 Completed | 2 Needs Review")
        print(f"Revenue:   ₹486.00")
        print(f"Printers:  2 Online / 3 Total")
        print("\nCredentials:")
        print("  Operator: operator@campus-xerox.local / operator123")
        print("  Admin:    admin@campus-xerox.local    / admin123")
        print("=======================================================\n")

    finally:
        session.close()


if __name__ == "__main__":
    seed_demo()
