def estimate_strawberry_yield(
    temp_c: float, 
    rh_percent: float, 
    co2_ppm: float, 
    ppfd_umol: float, 
    growth_day: int,
    night_mode: bool
) -> float:
    """
    Sophisticated true yield calculation taking all factors.
    Based loosely on Tochiotome characteristics.
    """
    from physics.thermodynamics import calc_vpd
    
    # 1. VPD factor
    vpd = calc_vpd(temp_c, rh_percent)
    vpd_factor = 1.0
    if vpd < 0.4:
        vpd_factor = 0.7  # fungal risk, poor transpiration
    elif vpd > 1.2:
        vpd_factor = 0.6  # stomata close
        
    # 2. DLI factor (Daily Light Integral) target=17 for strawberries
    hours = 0 if night_mode else 16
    dli = (ppfd_umol * hours * 3600) / 1e6
    dli_factor = min(1.0, dli / 17.0)
    
    # 3. CO2 factor
    co2_factor = min(1.0, co2_ppm / 1000.0) # Saturates around 1000ppm
    
    # 4. Growth day maturity factor
    if growth_day < 96:
        day_factor = 0.0
    else:
        day_factor = min(1.0, (growth_day - 95) / 25.0)
        
    base_plants = 720
    base_yield_kg = 0.025 # 25g per cycle per plant
    
    total_yield = base_plants * base_yield_kg * vpd_factor * dli_factor * co2_factor * day_factor
    return max(0.0, total_yield)
