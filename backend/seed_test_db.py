import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from database import engine, SessionLocal, init_db
from models import Customer, Catalogue, Order, Transaction

def seed():
    print("Initializing SQLite test database tables...")
    init_db()

    session = SessionLocal()
    try:
        if session.query(Customer).count() > 0:
            print("Database already contains data. Clearing existing records for fresh test...")
            session.query(Transaction).delete()
            session.query(Order).delete()
            session.query(Catalogue).delete()
            session.query(Customer).delete()
            session.commit()

        print("Seeding catalogue...")
        catalogue_items = [
            Catalogue(
                sku="ENG-HEAT-001",
                product_name="Chauffe-eau à gaz 10L ENERGICAL",
                category="Chauffage & Eau Chaude",
                subcategory="Chauffe-eau",
                unit_price=15000.0,
                stock_status="In Stock",
                short_desc="Chauffe-eau instantané à gaz 10 Litres haute performance",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-HEAT-002",
                product_name="Chaudière Murale Gaz 24kW",
                category="Chauffage & Eau Chaude",
                subcategory="Chaudières",
                unit_price=85000.0,
                stock_status="In Stock",
                short_desc="Chaudière murale double service chauffage et ECS 24kW",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-HEAT-003",
                product_name="Radiateur Aluminium 10 Éléments",
                category="Chauffage & Eau Chaude",
                subcategory="Radiateurs",
                unit_price=12500.0,
                stock_status="In Stock",
                short_desc="Radiateur aluminium coulé sous pression 10 éléments",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-PLUMB-001",
                product_name="Tube Multicouche Nu Ø16 (Rouleau 100m)",
                category="Plomberie & Tuyauterie",
                subcategory="Tubes Multicouche",
                unit_price=6500.0,
                stock_status="In Stock",
                short_desc="Tube multicouche PEX-AL-PEX Ø16mm haute résistance",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-ELEC-001",
                product_name="Disjoncteur Différentiel 40A 30mA",
                category="Électricité Industrielle",
                subcategory="Protection & Disjoncteurs",
                unit_price=3800.0,
                stock_status="In Stock",
                short_desc="Disjoncteur différentiel 2 pôles 40A sensibilité 30mA",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-ELEC-002",
                product_name="Câble Électrique Rigide 2.5mm² (100m)",
                category="Électricité Industrielle",
                subcategory="Câblage",
                unit_price=5400.0,
                stock_status="In Stock",
                short_desc="Câble rigide cuivre U-1000 R2V 3G2.5 mm²",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-PUMP-001",
                product_name="Pompe à Eau Immergée 1.5 HP",
                category="Pompage & Arrosage",
                subcategory="Pompes Immergées",
                unit_price=28000.0,
                stock_status="In Stock",
                short_desc="Pompe immergée pour forage et puits 1.5 CV",
                ever_sold=True
            ),
            Catalogue(
                sku="ENG-SAN-001",
                product_name="Robinet Mitigeur Évier Chromé",
                category="Sanitaire & Robinetterie",
                subcategory="Mitigeurs",
                unit_price=4800.0,
                stock_status="In Stock",
                short_desc="Mitigeur bec haut orientable pour évier cuisine",
                ever_sold=True
            ),
        ]
        session.add_all(catalogue_items)
        session.flush()

        wilayas = ["Alger", "Oran", "Sétif", "Constantine", "Blida", "Tlemcen", "Béjaïa", "Batna", "Annaba", "Biskra", "Djelfa", "Ouargla", "Mostaganem"]
        payment_methods = ["Cash on Delivery", "CIB & Edahabia Card", "Bank Transfer", "CCP Transfer", "Cheque Payment"]
        delivery_methods = ["Home Delivery", "Pickup Point", "Collection Point", "E-commerce Office", "EMS International"]

        print("Seeding customers...")
        customers = []
        for i in range(1, 101):
            cid = f"CLT_S{i:06d}"
            ctype = "B2B" if i % 3 == 0 else "B2C"
            wilaya = random.choice(wilayas)
            first_date = datetime(2024, 1, 1).date() + timedelta(days=random.randint(0, 180))
            last_date = first_date + timedelta(days=random.randint(10, 180))
            orders_count = random.randint(1, 12)
            avg_basket = random.randint(12000, 85000) if ctype == "B2B" else random.randint(3500, 25000)
            total_amt = orders_count * avg_basket

            c = Customer(
                customer_id_stage=cid,
                customer_type_inferred=ctype,
                wilaya=wilaya,
                first_order_date=first_date,
                last_order_date=last_date,
                orders_count=orders_count,
                total_amount=total_amt,
                average_basket=avg_basket
            )
            customers.append(c)
        session.add_all(customers)
        session.flush()

        print("Seeding orders & transactions...")
        orders = []
        transactions = []
        order_idx = 1
        
        base_date = datetime(2024, 1, 1)
        for cust in customers:
            n_orders = cust.orders_count
            for o in range(n_orders):
                oid = f"CMD_2024_{order_idx:06d}"
                odate = base_date + timedelta(days=random.randint(1, 350), hours=random.randint(8, 18))
                pay_method = random.choice(payment_methods)
                del_method = random.choice(delivery_methods)
                
                n_items = random.randint(1, 3)
                selected_prods = random.sample(catalogue_items, n_items)
                
                order_total = 0.0
                order_qty = 0
                
                for prod in selected_prods:
                    qty = random.randint(1, 5) if cust.customer_type_inferred == "B2B" else random.randint(1, 2)
                    line_tot = float(prod.unit_price) * qty
                    order_total += line_tot
                    order_qty += qty
                    
                    t = Transaction(
                        order_id_stage=oid,
                        customer_id_stage=cust.customer_id_stage,
                        order_date=odate,
                        wilaya_raw=cust.wilaya,
                        wilaya_normalized=cust.wilaya,
                        geo_quality_flag="VALID",
                        customer_type_inferred=cust.customer_type_inferred,
                        sku=prod.sku,
                        product_name=prod.product_name,
                        sku_quality="VALID",
                        category=prod.category,
                        subcategory=prod.subcategory,
                        quantity=qty,
                        unit_price=prod.unit_price,
                        line_total=line_tot,
                        order_status="Completed",
                        payment_method_group=pay_method,
                        sales_channel=del_method,
                        has_negative_price=False
                    )
                    transactions.append(t)

                ord_obj = Order(
                    order_id_stage=oid,
                    customer_id_stage=cust.customer_id_stage,
                    order_date=odate,
                    wilaya_raw=cust.wilaya,
                    wilaya_normalized=cust.wilaya,
                    customer_type_inferred=cust.customer_type_inferred,
                    order_status="Completed",
                    payment_method_group=pay_method,
                    sales_channel=del_method,
                    order_total_amount=order_total,
                    total_quantity=order_qty,
                    n_lines=n_items
                )
                orders.append(ord_obj)
                order_idx += 1

        session.add_all(orders)
        session.add_all(transactions)
        session.commit()

        print(f"Successfully seeded SQLite test DB!")
        print(f" - Catalogues: {len(catalogue_items)}")
        print(f" - Customers: {len(customers)}")
        print(f" - Orders: {len(orders)}")
        print(f" - Transactions: {len(transactions)}")

    except Exception as e:
        session.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed()
