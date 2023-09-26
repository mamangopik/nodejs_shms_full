import asyncio
import websockets
import formula
import json
import numpy as np
import time
from scipy import interpolate
from scipy.signal import argrelextrema

fft_callbackx = {}
fft_callbackx['frequency']=[]
fft_callbackx['magnitude']=[]

fft_callbacky = {}
fft_callbacky['frequency']=[]
fft_callbacky['magnitude']=[]

fft_callbackz = {}
fft_callbackz['frequency']=[]
fft_callbackz['magnitude']=[]

fft_callback = {}
fft_callback['frequency']=[]
fft_callback['magnitude']=[]

client_data = {
    'x':[],
    'y':[],
    'z':[]
}

fft_x = formula.fftProcessor(client_data['x'],2048,fft_callbackx)
fft_y = formula.fftProcessor(client_data['y'],2048,fft_callbacky)
fft_z = formula.fftProcessor(client_data['z'],2048,fft_callbackz)

def interpolate_data(x, y, new_length):
    f = interpolate.interp1d(x, y, kind='quadratic')
    new_x = np.linspace(min(x), max(x), new_length)
    new_y = f(new_x)
    return new_x, new_y

async def handle_connection(websocket, path):
    print("Client connected")
    try:
        while True:
            await asyncio.sleep(0.1)
            try:
                message = await websocket.recv()
                json_data = json.loads(message)  # Parse the received JSON
                # print("Received JSON:", json_data)
                fft_x.calculate2((1/200),json_data['x'],5)
                fft_y.calculate2((1/200),json_data['y'],5)
                fft_z.calculate2((1/200),json_data['z'],5)

                fft_callbackx['frequency'] = fft_callbackx['frequency'].tolist()
                fft_callbackx['magnitude'] = fft_callbackx['magnitude'].tolist()

                fft_callbacky['frequency'] = fft_callbacky['frequency'].tolist()
                fft_callbacky['magnitude'] = fft_callbacky['magnitude'].tolist()

                fft_callbackz['frequency'] = fft_callbackz['frequency'].tolist()
                fft_callbackz['magnitude'] = fft_callbackz['magnitude'].tolist()

                new_length = 512

                interpolated_x, interpolated_magnitude_x = np.abs(interpolate_data(fft_callbackx['frequency'], fft_callbackx['magnitude'], new_length))
                interpolated_y, interpolated_magnitude_y = np.abs(interpolate_data(fft_callbacky['frequency'], fft_callbacky['magnitude'], new_length))
                interpolated_z, interpolated_magnitude_z = np.abs(interpolate_data(fft_callbackz['frequency'], fft_callbackz['magnitude'], new_length))
                
                fft_callbackx['frequency'] = interpolated_x.tolist()
                fft_callbackx['magnitude'] = interpolated_magnitude_x.tolist()

                fft_callbacky['frequency'] = interpolated_y.tolist()
                fft_callbacky['magnitude'] = interpolated_magnitude_y.tolist()

                fft_callbackz['frequency'] = interpolated_z.tolist()
                fft_callbackz['magnitude'] = interpolated_magnitude_z.tolist()

                peaks = {
                    'x':[],'y':[],'z':[]
                }

                x=fft_callbackx['frequency']
                y=fft_callbackx['magnitude']
                local_maxima_indices = argrelextrema(np.array(y), np.greater)[0]
                sorted_indices = sorted(local_maxima_indices, key=lambda i: y[i], reverse=True)[:json_data['peaks_req']]
                for i, index in enumerate(sorted_indices):
                    value = y[index]
                    frequency = x[index]
                    peaks['x'].append((f'{frequency:.2f}',f'{value:.6f}'))

                x=fft_callbacky['frequency']
                y=fft_callbacky['magnitude']
                local_maxima_indices = argrelextrema(np.array(y), np.greater)[0]
                sorted_indices = sorted(local_maxima_indices, key=lambda i: y[i], reverse=True)[:json_data['peaks_req']]
                for i, index in enumerate(sorted_indices):
                    value = y[index]
                    frequency = x[index]
                    peaks['y'].append((f'{frequency:.2f}',f'{value:.6f}'))

                x=fft_callbackz['frequency']
                y=fft_callbackz['magnitude']
                local_maxima_indices = argrelextrema(np.array(y), np.greater)[0]
                sorted_indices = sorted(local_maxima_indices, key=lambda i: y[i], reverse=True)[:json_data['peaks_req']]
                for i, index in enumerate(sorted_indices):
                    value = y[index]
                    frequency = x[index]
                    peaks['z'].append((f'{frequency:.2f}',f'{value:.6f}'))

                response = {
                    "status": "success",
                    "data": {
                        'x':(fft_callbackx),
                        'y':(fft_callbacky),
                        'z':(fft_callbackz)
                    },
                    "peaks":peaks
                }

                # Send response back to the client
                await websocket.send(json.dumps(response))
            except Exception as e:
                pass
    except websockets.ConnectionClosed:
        print("Client disconnected")

start_server = websockets.serve(handle_connection, "0.0.0.0", 5556)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
