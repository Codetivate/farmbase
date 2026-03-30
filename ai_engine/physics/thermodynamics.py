import math

def calc_vpd(temp_c: float, rh_percent: float) -> float:
    """
    Calculate Vapor Pressure Deficit (VPD) using the precise Penman-Monteith method.
    Returns VPD in kPa.
    """
    if rh_percent < 0 or rh_percent > 100:
        return 0.0
        
    # Saturation vapor pressure (SVP) in kPa
    svp = 0.6108 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
    
    # Actual vapor pressure
    avp = svp * (rh_percent / 100.0)
    
    vpd = svp - avp
    return float(round(vpd * 10000.0) / 10000.0)

def calc_hvac_load_kw(target_temp: float, ambient_temp: float, volume_m3: float) -> float:
    """
    Simplified cooling/heating load in kW.
    """
    delta_t = ambient_temp - target_temp
    # Specific heat of air ~ 1.006 kJ/kg.K, density ~ 1.2 kg/m3
    mass_air = volume_m3 * 1.2
    energy_kj = mass_air * 1.006 * delta_t
    # Assume we want to correct it in 1 hour -> divide by 3600s
    kw = energy_kj / 3600.0
    return abs(kw)
