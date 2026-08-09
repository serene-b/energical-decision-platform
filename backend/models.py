from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Customer(Base):
    __tablename__ = "customers"

    customer_id_stage = Column(String(50), primary_key=True)
    customer_type_inferred = Column(String(20))
    wilaya = Column(String(100))
    first_order_date = Column(Date)
    last_order_date = Column(Date)
    orders_count = Column(Integer)
    total_amount = Column(Numeric(12, 2))
    average_basket = Column(Numeric(12, 2))

    orders = relationship("Order", back_populates="customer")
    transactions = relationship("Transaction", back_populates="customer")


class Catalogue(Base):
    __tablename__ = "catalogue"

    sku = Column(String(50), primary_key=True)
    product_name = Column(String(255))
    category = Column(String(100))
    subcategory = Column(String(100))
    unit_price = Column(Numeric(12, 2))
    stock_status = Column(String(50))
    short_desc = Column(Text)
    ever_sold = Column(Boolean)

    transactions = relationship("Transaction", back_populates="product")


class Order(Base):
    __tablename__ = "orders"

    order_id_stage = Column(String(50), primary_key=True)
    customer_id_stage = Column(String(50), ForeignKey("customers.customer_id_stage"))
    order_date = Column(DateTime)
    wilaya_raw = Column(String(100))
    wilaya_normalized = Column(String(100))
    customer_type_inferred = Column(String(20))
    order_status = Column(String(50))
    payment_method_group = Column(String(50))
    sales_channel = Column(String(50))
    order_total_amount = Column(Numeric(12, 2))
    total_quantity = Column(Integer)
    n_lines = Column(Integer)

    customer = relationship("Customer", back_populates="orders")
    transactions = relationship("Transaction", back_populates="order")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    order_id_stage = Column(String(50), ForeignKey("orders.order_id_stage"))
    customer_id_stage = Column(String(50), ForeignKey("customers.customer_id_stage"))
    order_date = Column(DateTime)
    wilaya_raw = Column(String(100))
    wilaya_normalized = Column(String(100))
    geo_quality_flag = Column(String(20))
    customer_type_inferred = Column(String(20))
    sku = Column(String(50), ForeignKey("catalogue.sku"))
    product_name = Column(String(255))
    sku_quality = Column(String(20))
    category = Column(String(100))
    subcategory = Column(String(100))
    quantity = Column(Integer)
    unit_price = Column(Numeric(12, 2))
    line_total = Column(Numeric(12, 2))
    order_status = Column(String(50))
    payment_method_group = Column(String(50))
    sales_channel = Column(String(50))
    has_negative_price = Column(Boolean)

    order = relationship("Order", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    product = relationship("Catalogue", back_populates="transactions")