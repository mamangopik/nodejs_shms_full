import time
import numpy as np
from scipy.fft import fft, fftfreq
from scipy.signal import find_peaks
from scipy import fftpack
import scipy.integrate as integrate
from scipy.interpolate import make_interp_spline

import peakutils
import sys 
import os
import time
 
class updateSamplingTime():
	def __init__(self,arrayData,interval):
		self.data = arrayData
		self.interval = interval
		self.t1 = time.time()
		self.samplingTime = 10/self.interval
	def updateTimer(self):
		self.t1 = time.time()
		# print('sekarang jam:',self.t1)
	def get(self):
		if(len(self.data)>0 and len(self.data)%self.interval==0):
			self.elapsedTime = time.time()-self.t1
			self.samplingTime = self.elapsedTime/self.interval
			print('new elapsed time:',self.elapsedTime,'from',self.interval,'data',',T:',self.samplingTime,"f:",1.0/self.samplingTime)
			return self.samplingTime
		if(len(self.data)>0 and len(self.data)%(self.interval+1)==0):
			self.updateTimer()
		return self.samplingTime
	def setInterval(self,interval):
		self.interval = interval
	def setData(self,arrayData):
		self.data = arrayData


class fftProcessor():
	"""docstring for fftProcessor"""
	def __init__(self,arrayData,arr_range,callback):
		self.updater = updateSamplingTime(arrayData,int(arr_range/2))
		self.limit = arr_range
		self.counter = 0
		self.signal = arrayData
		self.callback = callback
		self.arrStart = 0
		self.arrStop = 0
	def setOffset(self,arr_range):
		self.limit = arr_range
		# self.counter = 0
	def calculate2(self,dt,arrayData,nyquist_div=2,absolute=1):
		self.samplingTime = dt
		self.signal_scope = arrayData
		self.raw_fft_data = self.signal_scope

		self.arrStart = self.counter
		self.arrStop = self.limit+self.counter
		self.freq_sampling = 1.0/self.samplingTime
		self.fft_result = np.fft.fft(self.raw_fft_data,len(self.raw_fft_data))

		self.magnitude = 2/np.size(self.raw_fft_data)*self.fft_result[range(int(len(self.fft_result)/nyquist_div))]
			
		self.freq = np.arange(0,int(self.freq_sampling/nyquist_div),int(self.freq_sampling/nyquist_div)/int(len(self.magnitude)))
		data_len = len(self.magnitude)-2
		freq_buffer = self.freq[:data_len]
		magnitude_buffer = self.magnitude[:data_len]

		# self.freq = freq_buffer
		# self.magnitude = magnitude_buffer
		# self.callback['frequency'] = self.freq
		# self.callback['magnitude'] = self.magnitude
		# self.counter+=1
		# indexes = peakutils.indexes(self.magnitude, thres=0.2, min_dist=(int(len(self.magnitude)*0.3)))
		# print(self.freq[indexes])

		self.freq = freq_buffer
		self.magnitude = magnitude_buffer
		xnew = np.linspace(min(self.freq), max(self.freq), 100)
		spl = make_interp_spline(self.freq, self.magnitude, 3)
		ynew = spl(xnew)
		ynew[0]=0
		if absolute == 1:
			self.callback['frequency'] = np.abs(xnew)
			self.callback['magnitude'] = np.abs(ynew)
		else:
			self.callback['frequency'] = (xnew)
			self.callback['magnitude'] = (ynew)
		self.counter+=1
		indexes = peakutils.indexes(ynew, thres=0.2, min_dist=5)
		# print(xnew[indexes])


	def calculate(self,t):
		self.samplingTime = t
		self.signal_scope = self.signal[self.counter:self.limit+self.counter]
		self.raw_fft_data = self.signal_scope
		if (len(self.signal)>=self.limit*2):
			if(len(self.raw_fft_data)>=self.limit):
				self.arrStart = self.counter
				self.arrStop = self.limit+self.counter
				self.freq_sampling = 1.0/self.samplingTime
				self.fft_result = np.fft.fft(self.raw_fft_data,len(self.raw_fft_data))

				self.magnitude = 2/np.size(self.raw_fft_data)*self.fft_result[range(int(len(self.fft_result)/2))]
				# self.magnitude = self.fft_result[range(int(len(self.fft_result)/2))]/10
				# self.magnitude = self.fft_result[range(int(len(self.fft_result)/2))]
			
				self.freq = np.arange(0,int(self.freq_sampling/2),int(self.freq_sampling/2)/int(len(self.magnitude)))
				# print(len(self.raw_fft_data),'from index',self.counter,'to',self.limit+self.counter,'shape end:',self.freq.shape)
				data_len = len(self.magnitude)-2
				freq_buffer = self.freq[:data_len]
				magnitude_buffer = self.magnitude[:data_len]

				self.freq = freq_buffer
				self.magnitude = magnitude_buffer
				self.callback['frequency'] = self.freq
				self.callback['magnitude'] = self.magnitude
				self.counter+=1
			else:
				pass
	
	def static_displacement(self,arrayData,t,callback):
		staticDisplacementVal=np.trapz(arrayData,x=t)
		# print("ini:",np.real(staticDisplacementVal))
		callback.append(np.real(staticDisplacementVal)*1000)