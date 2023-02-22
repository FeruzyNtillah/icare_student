package org.openmrs.module.icare.store.models;

// Generated Oct 7, 2020 12:48:40 PM by Hibernate Tools 5.2.10.Final

import org.openmrs.Location;
import org.openmrs.module.icare.core.Item;
import org.openmrs.module.icare.store.util.Stockable;

import javax.persistence.*;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * StReceiptItem generated by hbm2java
 */
@Embeddable
class ReceiptItemId implements java.io.Serializable {
	
	@ManyToOne
	@JoinColumn(name = "receipt_id", nullable = false)
	private Receipt receipt;
	
	@ManyToOne
	@JoinColumn(name = "item_id", nullable = false)
	private Item item;
	
	@Column(name = "batch_no", length = 32)
	private String batchNo;
	
	public Receipt getReceipt() {
		return receipt;
	}
	
	public void setReceipt(Receipt receipt) {
		this.receipt = receipt;
	}
	
	public Item getItem() {
		return item;
	}
	
	public void setItem(Item item) {
		this.item = item;
	}
	
	public String getBatchNo() {
		return this.batchNo;
	}
	
	public void setBatchNo(String batchNo) {
		this.batchNo = batchNo;
	}
}

@Entity
@Table(name = "st_receipt_item")
public class ReceiptItem implements java.io.Serializable, Stockable {
	
	@EmbeddedId
	private ReceiptItemId id;
	
	@Column(name = "quantity")
	private Double quantity;
	
	@Temporal(TemporalType.DATE)
	@Column(name = "expiry_date", length = 10)
	private Date expiryDate;
	
	public Double getQuantity() {
		return this.quantity;
	}
	
	@Override
	public Location getLocation() {
		return this.id.getReceipt().getReceivingLocation();
	}
	
	public void setQuantity(Double quantity) {
		this.quantity = quantity;
	}
	
	@Override
	public Item getItem() {
		return this.id.getItem();
	}
	
	public String getBatchNo() {
		return this.id.getBatchNo();
	}
	
	public void setBatchNo(String batchNo) {
		if (id == null) {
			this.id = new ReceiptItemId();
		}
		
		this.id.setBatchNo(batchNo);
	}
	
	public Date getExpiryDate() {
		return this.expiryDate;
	}
	
	public void setExpiryDate(Date expiryDate) {
		this.expiryDate = expiryDate;
	}
	
	public void setReceipt(Receipt receipt) {
		if (id == null) {
			this.id = new ReceiptItemId();
		}
		this.id.setReceipt(receipt);
	}
	
	public void setItem(Item item) {
		if (id == null) {
			this.id = new ReceiptItemId();
		}
		this.id.setItem(item);
	}
	
	public ReceiptItemId getId() {
		return this.id;
	}
	
	public Map<String, Object> toMap() {
		Map<String, Object> receiptItemObject = new HashMap<String, Object>();
		
		receiptItemObject.put("quantity", this.getQuantity());
		
		Map<String, Object> itemObject = new HashMap<String, Object>();
		itemObject.put("uuid", this.getId().getItem().getUuid());
		if (this.getId().getItem().getConcept() != null) {
			itemObject.put("display", this.getId().getItem().getConcept().getDisplayString());
		} else if (this.getId().getItem().getDrug() != null) {
			itemObject.put("display", this.getId().getItem().getDrug().getDisplayName());
		}
		receiptItemObject.put("item", itemObject);
		
		Map<String, Object> receiptObject = new HashMap<String, Object>();
		receiptObject.put("uuid", this.getId().getReceipt().getUuid());
		
		receiptItemObject.put("receipt", receiptObject);
		
		return receiptItemObject;
	}
}
