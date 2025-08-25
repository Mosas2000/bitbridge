;; BitBridge Payment Gateway Contract
;; Handles sBTC payments for merchants with auto-conversion to STX

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INVALID_AMOUNT (err u101))
(define-constant ERR_PAYMENT_NOT_FOUND (err u102))
(define-constant ERR_PAYMENT_ALREADY_PROCESSED (err u103))
(define-constant ERR_INSUFFICIENT_BALANCE (err u104))
(define-constant ERR_PRICE_FEED_ERROR (err u105))
(define-constant ERR_CONVERSION_FAILED (err u106))

;; Price feed constants (mock values for MVP)
(define-constant SBTC_DECIMALS u8) ;; sBTC has 8 decimal places
(define-constant STX_DECIMALS u6)  ;; STX has 6 decimal places
(define-constant PRICE_PRECISION u1000000) ;; 6 decimal precision for price

;; Data Variables
(define-data-var payment-counter uint u0)
(define-data-var contract-enabled bool true)
;; Mock price feed: sBTC price in STX (with 6 decimal precision)
;; Example: 50000000 = 50.000000 STX per sBTC
(define-data-var sbtc-stx-price uint u50000000)
(define-data-var price-last-updated uint u0)

;; Data Maps
(define-map payments
  { payment-id: uint }
  {
    merchant: principal,
    customer: principal,
    amount-sbtc: uint,
    amount-stx: uint,
    status: (string-ascii 20),
    created-at: uint,
    processed-at: (optional uint)
  }
)

(define-map merchant-balances
  { merchant: principal }
  { balance-stx: uint }
)

;; Read-only functions
(define-read-only (get-payment (payment-id uint))
  (map-get? payments { payment-id: payment-id })
)

(define-read-only (get-merchant-balance (merchant principal))
  (default-to { balance-stx: u0 } (map-get? merchant-balances { merchant: merchant }))
)

(define-read-only (get-payment-counter)
  (var-get payment-counter)
)

(define-read-only (is-contract-enabled)
  (var-get contract-enabled)
)

(define-read-only (get-sbtc-stx-price)
  {
    price: (var-get sbtc-stx-price),
    last-updated: (var-get price-last-updated)
  }
)

(define-read-only (calculate-stx-amount (sbtc-amount uint))
  (let (
    (current-price (var-get sbtc-stx-price))
  )
    ;; Convert sBTC (8 decimals) to STX (6 decimals) using current price
    ;; Formula: (sbtc-amount * price) / (10^8 * 10^6) * 10^6
    ;; Simplified: (sbtc-amount * price) / 10^8
    (/ (* sbtc-amount current-price) (pow u10 SBTC_DECIMALS))
  )
)

;; Private functions
(define-private (increment-payment-counter)
  (let ((current-counter (var-get payment-counter)))
    (var-set payment-counter (+ current-counter u1))
    (+ current-counter u1)
  )
)

;; Public functions
(define-public (create-payment (merchant principal) (amount-sbtc uint))
  (let (
    (payment-id (increment-payment-counter))
    (current-block-height stacks-block-height)
  )
    (asserts! (var-get contract-enabled) ERR_UNAUTHORIZED)
    (asserts! (> amount-sbtc u0) ERR_INVALID_AMOUNT)
    
    ;; Create payment record
    (map-set payments
      { payment-id: payment-id }
      {
        merchant: merchant,
        customer: tx-sender,
        amount-sbtc: amount-sbtc,
        amount-stx: u0, ;; Will be set during conversion
        status: "pending",
        created-at: current-block-height,
        processed-at: none
      }
    )
    
    (ok payment-id)
  )
)

(define-public (process-payment (payment-id uint))
  (let (
    (payment-data (unwrap! (map-get? payments { payment-id: payment-id }) ERR_PAYMENT_NOT_FOUND))
    (current-block-height stacks-block-height)
    (sbtc-amount (get amount-sbtc payment-data))
    (converted-stx-amount (calculate-stx-amount sbtc-amount))
  )
    (asserts! (var-get contract-enabled) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status payment-data) "pending") ERR_PAYMENT_ALREADY_PROCESSED)
    (asserts! (> converted-stx-amount u0) ERR_CONVERSION_FAILED)

    ;; Update payment status with auto-converted amount
    (map-set payments
      { payment-id: payment-id }
      (merge payment-data {
        amount-stx: converted-stx-amount,
        status: "completed",
        processed-at: (some current-block-height)
      })
    )
    
    ;; Update merchant balance
    (let (
      (merchant (get merchant payment-data))
      (current-balance (get balance-stx (get-merchant-balance merchant)))
    )
      (map-set merchant-balances
        { merchant: merchant }
        { balance-stx: (+ current-balance converted-stx-amount) }
      )
    )

    (ok {
      payment-id: payment-id,
      sbtc-amount: sbtc-amount,
      stx-amount: converted-stx-amount,
      conversion-rate: (var-get sbtc-stx-price)
    })
  )
)

(define-public (withdraw-balance (amount uint))
  (let (
    (merchant-balance (get balance-stx (get-merchant-balance tx-sender)))
  )
    (asserts! (var-get contract-enabled) ERR_UNAUTHORIZED)
    (asserts! (>= merchant-balance amount) ERR_INSUFFICIENT_BALANCE)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    
    ;; Update merchant balance
    (map-set merchant-balances
      { merchant: tx-sender }
      { balance-stx: (- merchant-balance amount) }
    )
    
    ;; TODO: Implement actual STX transfer to merchant
    ;; This would require STX token contract integration
    
    (ok amount)
  )
)

;; Admin functions
(define-public (toggle-contract (enabled bool))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (var-set contract-enabled enabled)
    (ok enabled)
  )
)

(define-public (update-price-feed (new-price uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_UNAUTHORIZED)
    (asserts! (> new-price u0) ERR_INVALID_AMOUNT)
    (var-set sbtc-stx-price new-price)
    (var-set price-last-updated stacks-block-height)
    (ok {
      new-price: new-price,
      updated-at: stacks-block-height
    })
  )
)

;; Batch payment processing for efficiency
(define-public (process-multiple-payments (payment-ids (list 10 uint)))
  (begin
    (asserts! (var-get contract-enabled) ERR_UNAUTHORIZED)
    (ok (map process-single-payment payment-ids))
  )
)

(define-private (process-single-payment (payment-id uint))
  (match (process-payment payment-id)
    success success
    error { payment-id: payment-id, sbtc-amount: u0, stx-amount: u0, conversion-rate: u0 }
  )
)