from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class SaleDecisionCalculation:
    quantity_after_loss_kg: float
    storage_cost_total: float

    sell_now_gross: float
    sell_now_net: float

    store_expected_gross: float
    store_expected_net: float
    store_min_net: float | None
    store_max_net: float | None

    expected_advantage: float
    conservative_advantage: float | None

    break_even_future_price_per_kg: float

    recommendation: str
    recommendation_reason: str


def _money(value: float) -> float:
    return round(float(value), 2)


def _quantity(value: float) -> float:
    return round(float(value), 3)


def calculate_sale_decision(
    *,
    quantity_kg: float,
    current_price_per_kg: float,
    future_price_per_kg: float,
    expected_min_price_per_kg: float | None,
    expected_max_price_per_kg: float | None,
    holding_days: int,
    storage_cost_per_kg_per_day: float,
    transport_cost_now: float,
    transport_cost_later: float,
    expected_storage_loss_percent: float,
    other_holding_cost: float,
) -> SaleDecisionCalculation:
    """
    Transparent arithmetic only.

    No live price is invented here. Prices and costs must be supplied
    from validated application records or explicit farmer inputs.
    """

    if quantity_kg <= 0:
        raise ValueError("Quantity must be greater than zero.")

    if current_price_per_kg <= 0:
        raise ValueError(
            "Current comparison price must be greater than zero."
        )

    if future_price_per_kg <= 0:
        raise ValueError(
            "Predicted future price must be greater than zero."
        )

    if holding_days < 1:
        raise ValueError("Holding days must be at least 1.")

    if storage_cost_per_kg_per_day < 0:
        raise ValueError("Storage cost cannot be negative.")

    if transport_cost_now < 0 or transport_cost_later < 0:
        raise ValueError("Transport cost cannot be negative.")

    if other_holding_cost < 0:
        raise ValueError("Other holding cost cannot be negative.")

    if not 0 <= expected_storage_loss_percent <= 50:
        raise ValueError(
            "Expected storage loss percent must be between 0 and 50."
        )

    loss_fraction = (
        float(expected_storage_loss_percent) / 100.0
    )

    quantity_after_loss = (
        float(quantity_kg) * (1.0 - loss_fraction)
    )

    storage_cost_total = (
        float(quantity_kg)
        * float(storage_cost_per_kg_per_day)
        * int(holding_days)
    )

    sell_now_gross = (
        float(quantity_kg)
        * float(current_price_per_kg)
    )

    sell_now_net = (
        sell_now_gross
        - float(transport_cost_now)
    )

    future_common_cost = (
        storage_cost_total
        + float(transport_cost_later)
        + float(other_holding_cost)
    )

    store_expected_gross = (
        quantity_after_loss
        * float(future_price_per_kg)
    )

    store_expected_net = (
        store_expected_gross
        - future_common_cost
    )

    store_min_net = None
    if (
        expected_min_price_per_kg is not None
        and expected_min_price_per_kg > 0
    ):
        store_min_net = (
            quantity_after_loss
            * float(expected_min_price_per_kg)
            - future_common_cost
        )

    store_max_net = None
    if (
        expected_max_price_per_kg is not None
        and expected_max_price_per_kg > 0
    ):
        store_max_net = (
            quantity_after_loss
            * float(expected_max_price_per_kg)
            - future_common_cost
        )

    expected_advantage = (
        store_expected_net - sell_now_net
    )

    conservative_advantage = None
    if store_min_net is not None:
        conservative_advantage = (
            store_min_net - sell_now_net
        )

    if quantity_after_loss <= 0:
        raise ValueError(
            "Expected storage loss leaves no saleable quantity."
        )

    break_even_future_price = (
        sell_now_net + future_common_cost
    ) / quantity_after_loss

    if (
        conservative_advantage is not None
        and conservative_advantage > 0
    ):
        recommendation = "STORE"
        recommendation_reason = (
            "Even the stored-value estimate using the prediction's "
            "lower expected price is above the sell-now net value."
        )

    elif expected_advantage > 0:
        recommendation = "CONSIDER_STORAGE"
        recommendation_reason = (
            "The central predicted stored value is above sell-now, "
            "but the lower expected price does not clearly confirm "
            "that advantage."
        )

    else:
        recommendation = "SELL_NOW"
        recommendation_reason = (
            "After entered storage, transport and expected loss costs, "
            "the central stored-value estimate does not exceed "
            "the sell-now net value."
        )

    return SaleDecisionCalculation(
        quantity_after_loss_kg=_quantity(
            quantity_after_loss
        ),
        storage_cost_total=_money(
            storage_cost_total
        ),
        sell_now_gross=_money(
            sell_now_gross
        ),
        sell_now_net=_money(
            sell_now_net
        ),
        store_expected_gross=_money(
            store_expected_gross
        ),
        store_expected_net=_money(
            store_expected_net
        ),
        store_min_net=(
            _money(store_min_net)
            if store_min_net is not None
            else None
        ),
        store_max_net=(
            _money(store_max_net)
            if store_max_net is not None
            else None
        ),
        expected_advantage=_money(
            expected_advantage
        ),
        conservative_advantage=(
            _money(conservative_advantage)
            if conservative_advantage is not None
            else None
        ),
        break_even_future_price_per_kg=_money(
            break_even_future_price
        ),
        recommendation=recommendation,
        recommendation_reason=recommendation_reason,
    )
