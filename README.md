# Visualització del dataset de detecció d'intrusions de ciberseguretat

[Visualització interactiva aquí](https://josanescod.github.io/ciber-intrusion-visualization)

---

## Descripció 

Aquest projecte presenta tres visualitzacions: bubble chart, parallel coordinates plot i radial bar chart, que tenen com a objectiu respondre les següents preguntes:

1. Paràmetres de sessió més relacionats amb la probabilitat de detectar intrusions
2. Patrons multidimensionals de risc en sessions de xarxa
3. Distribució del risc i concentració d’atacs per protocol

## Fonts de dades

Les dades utilitzades provenen del dataset 'cybersecurity intrusion detection' disponible a Kaggle: [cybersecurity intrusion detection](https://www.kaggle.com/datasets/dnkumars/cybersecurity-intrusion-detection-dataset/data)


| Nom de la variable       | Tipus      | Significat                                                                 |
|--------------------------|------------|----------------------------------------------------------------------------|
| session_id              | text       | Identificador únic de sessió                                               |
| network_packet_size     | numèric    | Mida total dels paquets enviats                                            |
| protocol_type           | categòric  | Tipus de protocol: TCP, UDP, ICMP, altres                                  |
| login_attempts          | numèric    | Nombre d'intents d'inici de sessió                                         |
| session_duration        | numèric    | Durada total de la sessió en segons                                        |
| encryption_used         | categòric  | Tipus d'encriptació utilitzat: AES, DES, none                              |
| ip_reputation_score     | numèric    | Puntuació de reputació de la IP (0=dolenta, 1=bona)                        |
| failed_logins           | numèric    | Nombre d'intents d'inici de sessió fallits                                 |
| browser_type            | categòric  | Navegador utilitzat: Chrome, Firefox, Edge, Unknown                        |
| unusual_time_access     | binari     | Accés fora de l'horari habitual = 1, horari habitual = 0                   |
| attack_detected         | binari     | Intrusió detectada = 1, no detectada = 0                                   |
| packet_rate             | numèric    | Intensitat del trànsit (network_packet_size/session_duration)              |
| failed_login_ratio      | numèric    | Proporció d'intents fallits (failed_logins/login_attempts)                 |
| risk_level              | categòric  | Nivell de risc calculat a partir de attack_detected, ip_reputation_score...|
| encryption_strength     | ordinal    | Valor que reflecteix la fortalesa del xifratge (0=none, 1=DES, 2=AES)     |


## Tractament de les dades

1. Creació de noves variables mitjançant la combinació de variables del dataset original
```python
# Creació de noves variables
import numpy as np
import pandas as pd

# packet_rate = mida del paquet / durada de la sessió
df['packet_rate'] = df['network_packet_size'] / df['session_duration']

# failed_login_ratio = logins fallits / intents de login
df['failed_login_ratio'] = np.where(
    df['login_attempts'] > 0,
    df['failed_logins'] / df['login_attempts'],
    0.0
)

# risk_level (categòrica) combinant diversos indicadors
def compute_risk(row):
    if row['attack_detected'] == 1:
        return 'Confirmed'                     # atac ja etiquetat 
    if row['ip_reputation_score'] < 0.3 and row['unusual_time_access'] == 1:
        return 'High'                          # IP dolenta + horari estrany
    if row['ip_reputation_score'] >= 0.3 and row['unusual_time_access'] == 0:
        return 'Low'                           # IP bona + horari normal
    return 'Medium'                            # cas intermedi

df['risk_level'] = df.apply(compute_risk, axis=1)

# encryption_strength – número que indica la fortalesa del xifratge
enc_map = {'AES': 2, 'DES': 1, None: 0, 'None': 0}
df['encryption_strength'] = df['encryption_used'].map(enc_map).fillna(0).astype(int)
```

2. Tractament de valors extrems d'algunes variables mitjançant winsorizing
```python
# Aplicació de winsorizing
from scipy.stats.mstats import winsorize

df_w = df2.copy()

cols = ['session_duration', 'packet_rate', 'failed_login_ratio']

for col in cols:
    df_w[col] = winsorize(df2[col], limits=[0.01, 0.01])
```

## Tecnologies utilitzades

- [D3.js](https://d3js.org/)


---
