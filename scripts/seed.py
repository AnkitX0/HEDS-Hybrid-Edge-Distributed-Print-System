import sys
import os
import uuid
import secrets
from datetime import datetime, timezone, timedelta

# Add backend to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.database import SyncSessionLocal
from app.core.security import hash_password, generate_guest_order_token, hash_pickup_otp
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


def seed():
    session = SyncSessionLocal()
    try:
        print("[SEED] Clearing existing data...")
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

        print("[SEED] Creating Tenant...")
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Campus Print Services Ltd",
            slug="campus-print-services",
            status=TenantStatus.ACTIVE,
        )
        session.add(tenant)
        session.flush()

        print("[SEED] Creating Shops...")
        shop1 = Shop(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Campus Xerox & Print Hub",
            slug="campus-xerox",
            is_active=True,
            is_queue_paused=False,
        )
        shop2 = Shop(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            name="Engineering Block Digital Press",
            slug="eng-press",
            is_active=True,
            is_queue_paused=False,
        )
        session.add_all([shop1, shop2])
        session.flush()

        print("[SEED] Creating Users...")
        # 1 Platform Admin, 1 Shop Admin, 1 Shop Operator
        admin_pass = hash_password("admin123")
        op_pass = hash_password("operator123")

        u_platform = User(
            id=uuid.uuid4(),
            email="platform@heds.local",
            hashed_password=admin_pass,
            full_name="Platform SuperAdmin",
            role=UserRole.PLATFORM_ADMIN,
        )
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
        session.add_all([u_platform, u_admin, u_operator])
        session.flush()

        # Memberships
        m1 = ShopMember(shop_id=shop1.id, user_id=u_admin.id, role=ShopMemberRole.SHOP_ADMIN)
        m2 = ShopMember(shop_id=shop1.id, user_id=u_operator.id, role=ShopMemberRole.SHOP_OPERATOR)
        session.add_all([m1, m2])

        print("[SEED] Creating Pricing Rules...")
        pr1 = PricingRule(
            shop_id=shop1.id,
            name="Standard Campus Rates",
            paper_size="A4",
            bw_per_page_cents=100,      # ₹1.00
            color_per_page_cents=1000,  # ₹10.00
            duplex_discount_cents=0,    # standard per-page policy
            minimum_order_cents=100,    # ₹1.00 base minimum
            is_active=True,
        )
        pr2 = PricingRule(
            shop_id=shop2.id,
            name="Engineering Standard",
            paper_size="A4",
            bw_per_page_cents=250,      # ₹2.50
            color_per_page_cents=1200,  # ₹12.00
            duplex_discount_cents=60,
            minimum_order_cents=250,
            is_active=True,
        )
        session.add_all([pr1, pr2])
        session.flush()

        print("[SEED] Creating Edge Agents...")
        agent1_token = "agent-dev-key-12345"
        agent1 = Agent(
            id=uuid.uuid4(),
            shop_id=shop1.id,
            name="Xerox-Counter-Linux-01",
            agent_token_hash=AgentService.hash_agent_token(agent1_token),
            hostname="counter-pc-01",
            os_info="Ubuntu 22.04 LTS (x86_64)",
            version="0.1.0",
            status=AgentStatus.ONLINE,
            last_heartbeat_at=datetime.now(timezone.utc),
        )
        agent2 = Agent(
            id=uuid.uuid4(),
            shop_id=shop1.id,
            name="Xerox-Backoffice-02",
            agent_token_hash=AgentService.hash_agent_token("agent-backup-key-67890"),
            hostname="backoffice-pc-02",
            os_info="Ubuntu 22.04 LTS",
            version="0.1.0",
            status=AgentStatus.OFFLINE,
            last_heartbeat_at=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        session.add_all([agent1, agent2])
        session.flush()

        print("[SEED] Creating 4 Printers...")
        # 1 ONLINE Mock, 1 BUSY Mock, 1 ERROR Mock, 1 OFFLINE CUPS
        p1 = Printer(
            id=uuid.uuid4(),
            shop_id=shop1.id,
            agent_id=agent1.id,
            name="HP LaserJet Pro MFP 4104 (B/W High Speed)",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.ONLINE,
            capabilities_json={"color": False, "duplex": True, "paper_sizes": ["A4", "Letter"]},
        )
        p2 = Printer(
            id=uuid.uuid4(),
            shop_id=shop1.id,
            agent_id=agent1.id,
            name="Canon imageRUNNER ADVANCE C3530 (Color Duplex)",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.BUSY,
            capabilities_json={"color": True, "duplex": True, "paper_sizes": ["A4", "A3", "Letter"]},
        )
        p3 = Printer(
            id=uuid.uuid4(),
            shop_id=shop1.id,
            agent_id=agent1.id,
            name="Epson EcoTank L6270 (Color)",
            adapter_type=PrinterAdapterType.MOCK,
            status=PrinterStatus.ERROR,
            last_error="Paper Out in Tray 1",
            capabilities_json={"color": True, "duplex": True, "paper_sizes": ["A4"]},
        )
        p4 = Printer(
            id=uuid.uuid4(),
            shop_id=shop1.id,
            agent_id=agent2.id,
            name="Brother HL-L6400DW (Reserve B/W)",
            adapter_type=PrinterAdapterType.CUPS,
            status=PrinterStatus.OFFLINE,
            capabilities_json={"color": False, "duplex": True, "paper_sizes": ["A4"]},
        )
        session.add_all([p1, p2, p3, p4])
        session.flush()

        print("[SEED] Creating 20 Sample Orders with realistic states...")
        sample_titles = [
            "Data_Structures_Lab_Assignment.pdf",
            "Resume_Final_2026.pdf",
            "Project_Report_Compiler_Design.pdf",
            "ID_Proof_Aadhar_Card.pdf",
            "Hall_Ticket_Midterm_Exams.pdf",
            "Machine_Learning_Lecture_Notes.pdf",
            "Operating_Systems_Process_Sched.pdf",
            "Internship_Offer_Letter.pdf",
            "Thesis_Chapter_1_and_2.pdf",
            "Network_Security_Project_Doc.pdf",
            "Embedded_Systems_Schematic.pdf",
            "Hostel_Allotment_Form.pdf",
            "Fee_Receipt_Sem_6.pdf",
            "Database_Management_Schema_HW.pdf",
            "Cloud_Computing_Lab_Manual.pdf",
            "Research_Paper_Draft_v3.pdf",
            "Conference_Presentation_Slides.pdf",
            "Recommendation_Letter_Prof.pdf",
            "Identity_Verification_Cert.pdf",
            "Math_Tutorial_Solutions.pdf",
        ]

        states = [
            OrderState.COMPLETED,
            OrderState.COMPLETED,
            OrderState.COMPLETED,
            OrderState.PICKUP_READY,
            OrderState.PICKUP_READY,
            OrderState.PRINT_COMPLETED,
            OrderState.PRINTING,
            OrderState.DISPATCHED,
            OrderState.QUEUED,
            OrderState.QUEUED,
            OrderState.QUEUED,
            OrderState.PAID,
            OrderState.PAYMENT_PENDING,
            OrderState.CREATED,
            OrderState.PRINT_FAILED,
            OrderState.RECONCILING,
            OrderState.CANCELLED,
            OrderState.COMPLETED,
            OrderState.PICKUP_READY,
            OrderState.QUEUED,
        ]

        for i in range(20):
            filename = sample_titles[i]
            page_count = (i % 8) + 2  # 2 to 9 pages
            doc = Document(
                shop_id=shop1.id,
                original_filename=filename,
                sanitized_filename=filename.replace(" ", "_"),
                storage_path=f"storage_data/sample_{i+1}.pdf",
                mime_type="application/pdf",
                file_size_bytes=page_count * 45000,
                page_count=page_count,
                checksum_sha256=secrets.token_hex(32),
            )
            session.add(doc)
            session.flush()

            order_state = states[i]
            is_color = (i % 3 == 0)
            is_duplex = (i % 2 == 1)
            copies = 1 if i % 4 != 0 else 2

            rate = 1000 if is_color else 200
            total_cents = max(200, (rate * page_count * copies) - (50 if is_duplex else 0))

            order = Order(
                shop_id=shop1.id,
                order_number=f"ORD-{10000 + i}",
                guest_access_token=generate_guest_order_token(),
                document_id=doc.id,
                status=order_state,
                total_amount_cents=total_cents,
                currency="INR",
                pricing_breakdown_json={
                    "active_pages": page_count,
                    "copies": copies,
                    "color_mode": "COLOR" if is_color else "BW",
                    "duplex": is_duplex,
                    "final_amount_cents": total_cents,
                    "formatted_total": f"₹{total_cents / 100:.2f}",
                },
                created_at=datetime.now(timezone.utc) - timedelta(minutes=(20 - i) * 15),
            )
            session.add(order)
            session.flush()

            spec = PrintSpecification(
                order_id=order.id,
                copies=copies,
                color_mode=ColorMode.COLOR if is_color else ColorMode.BW,
                duplex=is_duplex,
                paper_size="A4",
                page_range="all",
                orientation=Orientation.PORTRAIT,
                scaling=Scaling.FIT,
            )
            session.add(spec)

            # Payment
            if order_state not in [OrderState.CREATED, OrderState.PAYMENT_PENDING]:
                payment = Payment(
                    order_id=order.id,
                    shop_id=shop1.id,
                    gateway=PaymentGatewayType.MOCK,
                    gateway_payment_id=f"pay_mock_{secrets.token_hex(8)}",
                    gateway_order_id=f"ord_mock_{secrets.token_hex(8)}",
                    amount_cents=total_cents,
                    currency="INR",
                    status=PaymentStatus.SUCCESS,
                )
                session.add(payment)

            # Print Job
            if order_state in [OrderState.QUEUED, OrderState.DISPATCHED, OrderState.PRINTING, OrderState.PRINT_COMPLETED, OrderState.PICKUP_READY, OrderState.COMPLETED, OrderState.PRINT_FAILED, OrderState.RECONCILING]:
                job_status_map = {
                    OrderState.QUEUED: JobStatus.QUEUED,
                    OrderState.DISPATCHED: JobStatus.DISPATCHED,
                    OrderState.PRINTING: JobStatus.PRINTING,
                    OrderState.PRINT_COMPLETED: JobStatus.COMPLETED,
                    OrderState.PICKUP_READY: JobStatus.COMPLETED,
                    OrderState.COMPLETED: JobStatus.COMPLETED,
                    OrderState.PRINT_FAILED: JobStatus.FAILED,
                    OrderState.RECONCILING: JobStatus.RECONCILING,
                }
                job = PrintJob(
                    order_id=order.id,
                    shop_id=shop1.id,
                    printer_id=p1.id if not is_color else p2.id,
                    agent_id=agent1.id,
                    priority=10,
                    status=job_status_map.get(order_state, JobStatus.QUEUED),
                    attempt_count=1 if order_state != OrderState.QUEUED else 0,
                    queued_at=order.created_at,
                    error_message="Paper jam detected in physical feed" if order_state == OrderState.PRINT_FAILED else None,
                )
                session.add(job)

            # Pickup OTP for Privacy Hold
            if order_state in [OrderState.PICKUP_READY, OrderState.COMPLETED]:
                otp = f"{482900 + i}"
                otp_h, otp_s = hash_pickup_otp(otp)
                pickup = Pickup(
                    order_id=order.id,
                    shop_id=shop1.id,
                    otp_hash=otp_h,
                    otp_salt=otp_s,
                    expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
                    confirmed_at=datetime.now(timezone.utc) if order_state == OrderState.COMPLETED else None,
                    confirmed_by_user_id=u_operator.id if order_state == OrderState.COMPLETED else None,
                )
                session.add(pickup)

        session.commit()
        print("[SEED] Successfully seeded database with realistic records!")
        print(f"Shop 1 QR Slug: http://localhost:3000/s/{shop1.slug}")
        print(f"Shop 1 ID: {shop1.id}")
        print(f"Agent 1 ID: {agent1.id}")
        print("Login credentials:")
        print("  Operator: operator@campus-xerox.local / operator123")
        print("  Admin:    admin@campus-xerox.local    / admin123")

    finally:
        session.close()


if __name__ == "__main__":
    seed()
